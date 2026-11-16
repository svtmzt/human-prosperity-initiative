/**
 * AI research-assistance workflow plus a deterministic, non-AI baseline.
 *
 * The AI workflow screens sources for prompt injection (quarantining them),
 * enforces request/input budgets, calls the configured provider, validates
 * output and returns a human-review queue. It never writes to the public site
 * and never reports completion when the provider is disabled or every call fails.
 */
import {buildGroundedMessages,promptFingerprint,sanitizeSourceText,scanForInjection,validateClaimExtraction} from "./safeguards.mjs";
import {RequestBudget} from "./providers.mjs";

export async function runClaimExtraction({sources,provider,config,knownMechanismIds,endpointLevels,now=()=>new Date().toISOString()}){
 const fingerprint=promptFingerprint("claim-extraction");
 const budget=new RequestBudget({maxRequests:config.maxRequests,maxInputChars:config.maxInputChars});
 const report={task:"claim-extraction",prompt:fingerprint,provider:provider.id,model:provider.model??null,
  status:"not_started",queue:[],quarantined:[],failures:[],rejectedItems:0,budget:null,
  humanReviewRequired:true,publishable:false};
 if(!provider.available){
  const r=await provider.complete();
  report.status="disabled";report.failures.push({sourceId:null,status:r.status,reason:r.reason});
  report.budget=budget.snapshot();return report;
 }
 let attempted=0,succeeded=0;
 for(const raw of sources){
  const {text,truncated}=sanitizeSourceText(raw.text,Math.floor(config.maxInputChars/2));
  const injection=scanForInjection(raw.text);
  if(injection.length){report.quarantined.push({sourceId:raw.id,findings:injection,action:"not_sent_to_model; human review required"});continue}
  const source={id:raw.id,url:raw.url,text};
  const messages=buildGroundedMessages("claim-extraction",[source],{allowedMechanismIds:knownMechanismIds,endpointLevels});
  const size=messages.reduce((n,m)=>n+m.content.length,0);
  if(!budget.reserve(size)){report.failures.push({sourceId:raw.id,status:"budget_exceeded",reason:"Request or input ceiling reached; remaining sources not sent."});break}
  attempted++;
  const r=await provider.complete(messages,{maxTokens:config.maxOutputTokens});
  if(!r.ok){report.failures.push({sourceId:raw.id,status:r.status,reason:r.reason});continue}
  const v=validateClaimExtraction(r.content,[source],{allowedMechanismIds:knownMechanismIds,endpointLevels,
   provenance:{provider:provider.id,model:r.model,promptId:fingerprint.id,promptSha256:fingerprint.sha256,generatedAt:now(),sourceTruncated:truncated}});
  report.rejectedItems+=v.rejected.length;
  if(["invalid_output","all_items_rejected"].includes(v.status))report.failures.push({sourceId:raw.id,status:v.status,reason:(v.errors[0]||"All proposed items failed validation")});
  else succeeded++;
  report.queue.push(...v.accepted);
 }
 report.budget=budget.snapshot();
 report.status=attempted===0?(report.quarantined.length?"all_sources_quarantined":"no_requests_sent"):
  succeeded===0?"failed":succeeded<sources.length?"partial_pending_human_review":"completed_pending_human_review";
 return report;
}

// Order matters: specific designs first. Generic words such as "peer-reviewed"
// must never classify a study as a review.
const DESIGN_RULES=[
 ["meta_analysis",/meta-analys/i],["systematic_review",/systematic[- ]review/i],
 ["regression_discontinuity",/regression[- ]discontinuity/i],["difference_in_differences",/difference[- ]in[- ]differences/i],
 ["quasi_experimental",/quasi[- ]experiment/i],["experimental_evaluation",/experimental[- ](?:evaluation|weatheri)/i],
 ["randomised_trial",/\bRCTs?\b|(?<!non)randomi[sz]ed|field[- ]experiments?|nationwide experiments?/i],
 ["observational",/nonrandomi[sz]ed|observational/i],["evidence_map",/evidence[- ]gap|\bmaps\b/i],
 ["narrative_or_synthesis",/critical[- ](?:evidence[- ])?review|research[- ]synthesis|narrative review|institutional synthesis/i],
 ["descriptive_report",/\breport\b|policy review|statistical/i]
];
const ENDPOINT_RULES=[["receipt",/receipt|take-up|enrol|claims?\b|participation/i],["approval",/approv/i],["application",/applica/i],["interest",/interest/i],
 ["earnings",/earning|income/i],["consumption",/consumption/i],["energy_use_or_bills",/energy use|bills?|electricity|savings/i],["warmth_or_comfort",/warmth|comfort/i],["health",/health|asthma|symptom/i]];
/**
 * Deterministic rule-based profile of a catalogue record: design family and
 * endpoint keywords. Transparent heuristics, not AI, not a quality appraisal.
 */
export function deterministicSourceProfile(record,structured){
 const designText=[structured?.design,record.titleOrType].filter(Boolean).join(" ");
 const design=(DESIGN_RULES.find(([,re])=>re.test(designText))||["unclassified"])[0];
 const endpointText=[structured?.measured_endpoint,structured?.finding_verified_from_abstract_or_summary].filter(Boolean).join(" ");
 const endpoints=ENDPOINT_RULES.filter(([,re])=>re.test(endpointText)).map(([k])=>k);
 return {sourceId:record.id,method:"deterministic_rule_based",design,endpointsMentioned:endpoints,
  extractionDepth:record.extractionDepth,riskOfBiasAssessed:record.formalRiskOfBias!=="not_assessed",note:"Keyword heuristic for triage; not an appraisal."};
}
