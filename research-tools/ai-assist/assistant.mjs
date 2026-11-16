/**
 * AI research-assistance workflows plus a deterministic, non-AI baseline.
 *
 * Every workflow: applies the data-routing policy (classification, personal
 * data screening, provider boundary) → screens sources for prompt injection
 * (quarantine, no request) → enforces request/input budgets → calls the
 * configured provider → validates output against the source → records
 * provenance (model actually served, upstream provider, parameters, prompt
 * fingerprint, tokens, cost, latency) → returns a private human-review queue.
 * It never writes to the public site and never reports completion when the
 * provider is disabled or every call fails.
 */
import {buildGroundedMessages,promptFingerprint,sanitizeSourceText,scanForInjection,outputSchemaFor,VALIDATORS,PROMPTS} from "./safeguards.mjs";
import {RequestBudget} from "./providers.mjs";
import {checkRouting,classifySource} from "./policy.mjs";

const SUCCESS=new Set(["valid_pending_review","partially_valid_pending_review","abstained","no_claims"]);

/**
 * Run one research task over a list of items. An item is
 * {id, sources:[{id,url,text,dataClass}], contextId?, contextName?}.
 * contradiction-detection items carry exactly two sources.
 */
export async function runResearchTask({task,items,provider,config,vocab={},now=()=>new Date().toISOString(),clock=()=>Date.now(),onProgress=null}){
 if(!PROMPTS[task])throw new Error("Unknown research task "+task);
 const fingerprint=promptFingerprint(task);
 const budget=new RequestBudget({maxRequests:config.maxRequests,maxInputChars:config.maxInputChars});
 const report={task,prompt:fingerprint,provider:{id:provider.id,kind:provider.kind??provider.id,boundary:provider.boundary??null},
  model:provider.model??null,permittedModels:provider.models??(provider.model?[provider.model]:[]),
  status:"not_started",queue:[],results:[],quarantined:[],blocked:[],failures:[],rejectedItems:0,
  totals:{requests:0,attempts:0,promptTokens:0,completionTokens:0,reasoningTokens:0,costUsdReported:0,costReports:0,latencyMs:0},
  budget:null,breaker:null,humanReviewRequired:true,publishable:false,startedAt:now()};
 if(!provider.available){
  const r=await provider.complete();
  report.status="disabled";report.failures.push({itemId:null,status:r.status,reason:r.reason});
  report.budget=budget.snapshot();report.finishedAt=now();return report;
 }
 let attempted=0,succeeded=0;
 for(const item of items){
  // 1. data-routing policy
  const routing=item.sources.map(s=>{const c=classifySource(s);return {sourceId:s.id,...c,...checkRouting({dataClass:c.dataClass,boundary:provider.boundary})}});
  const refused=routing.filter(r=>!r.allowed);
  if(refused.length){report.blocked.push({itemId:item.id,sources:refused.map(r=>({sourceId:r.sourceId,dataClass:r.dataClass,reason:r.reason})),action:"not_sent_to_model"});continue}
  // 2. prompt-injection quarantine
  const injection=item.sources.flatMap(s=>scanForInjection(s.text).map(f=>({sourceId:s.id,...f})));
  if(injection.length){report.quarantined.push({itemId:item.id,sourceId:injection[0].sourceId,findings:injection,action:"not_sent_to_model; human review required"});continue}
  // 3. sanitise and budget
  const perSource=Math.floor(config.maxInputChars/(2*Math.max(1,item.sources.length)));
  let truncated=false;
  const sources=item.sources.map(s=>{const t=sanitizeSourceText(s.text,perSource);truncated=truncated||t.truncated;return {id:s.id,url:s.url,text:t.text}});
  const messages=buildGroundedMessages(task,sources,{allowedMechanismIds:vocab.mechanismIds||[],endpointLevels:vocab.endpointLevels||[],contextId:item.contextId,contextName:item.contextName});
  const size=messages.reduce((n,m)=>n+m.content.length,0);
  if(!budget.reserve(size)){report.failures.push({itemId:item.id,status:"budget_exceeded",reason:"Request or input ceiling reached; remaining items not sent."});break}
  attempted++;
  const schema=outputSchemaFor(task,{allowedMechanismIds:vocab.mechanismIds||[],endpointLevels:vocab.endpointLevels||[]});
  const t0=clock();
  const r=await provider.complete(messages,{maxTokens:config.maxOutputTokens,task,schema});
  const wall=clock()-t0;
  report.totals.requests++;report.totals.attempts+=Array.isArray(r.attempts)?r.attempts.length:1;
  if(r.usage){report.totals.promptTokens+=r.usage.promptTokens||0;report.totals.completionTokens+=r.usage.completionTokens||0;report.totals.reasoningTokens+=r.usage.reasoningTokens||0;
   if(typeof r.usage.costUsd==="number"){report.totals.costUsdReported+=r.usage.costUsd;report.totals.costReports++}}
  report.totals.latencyMs+=wall;
  const provenance={providerKind:provider.kind??provider.id,boundary:provider.boundary??null,requestedModel:r.requestedModel??provider.model??null,
   servedModel:r.model??null,upstreamProvider:r.providerName??null,generationId:r.generationId??null,structuredMode:r.structuredMode??null,
   parameters:{temperature:0,maxOutputTokens:config.maxOutputTokens},promptId:fingerprint.id,promptSha256:fingerprint.sha256,
   generatedAt:now(),sourceTruncated:truncated,costVerification:r.costVerification??(r.costVerified?"verified":"not_reported"),
   dataClasses:[...new Set(routing.map(x=>x.dataClass))]};
  const resultRow={itemId:item.id,sourceIds:item.sources.map(s=>s.id),status:null,errors:[],accepted:0,rejected:0,abstained:false,
   latencyMs:wall,attempts:r.attempts??null,usage:r.usage??null,servedModel:r.model??null,upstreamProvider:r.providerName??null,structuredMode:r.structuredMode??null};
  if(!r.ok){
   report.failures.push({itemId:item.id,status:r.status,reason:r.reason,scope:r.scope??null});
   resultRow.status=r.status;resultRow.errors.push(r.reason);report.results.push(resultRow);
   onProgress?.(resultRow);
   if(r.scope==="account"||r.status==="circuit_open")break;
   continue;
  }
  const v=VALIDATORS[task](r.content,sources,{allowedMechanismIds:vocab.mechanismIds||[],endpointLevels:vocab.endpointLevels||[],contextId:item.contextId,provenance});
  report.rejectedItems+=v.rejected.length;
  resultRow.status=v.status;resultRow.errors=v.errors;resultRow.accepted=v.accepted.length;resultRow.rejected=v.rejected.length;resultRow.abstained=v.abstained;
  resultRow.parseRepair=v.parseRepair;resultRow.acceptedItems=v.accepted.map(({provenance:_p,...x})=>x);
  resultRow.rejectedReasons=v.rejected.map(x=>x.reasons);resultRow.rawProposals=v.accepted.length+v.rejected.length;
  report.results.push(resultRow);onProgress?.(resultRow);
  if(SUCCESS.has(v.status))succeeded++;
  else report.failures.push({itemId:item.id,status:v.status,reason:(v.errors[0]||"All proposed items failed validation")});
  report.queue.push(...v.accepted.map(x=>({task,itemId:item.id,...x})));
 }
 report.budget=budget.snapshot();
 report.breaker=provider.breaker?.snapshot?.()??null;
 report.status=attempted===0?(report.quarantined.length||report.blocked.length?"all_items_quarantined_or_blocked":"no_requests_sent"):
  succeeded===0?"failed":succeeded<items.length?"partial_pending_human_review":"completed_pending_human_review";
 report.finishedAt=now();
 return report;
}

/** Backwards-compatible claim-extraction entry point (single-source items). */
export async function runClaimExtraction({sources,provider,config,knownMechanismIds,endpointLevels,now=()=>new Date().toISOString()}){
 const report=await runResearchTask({task:"claim-extraction",provider,config,now,vocab:{mechanismIds:knownMechanismIds,endpointLevels},
  items:sources.map(s=>({id:s.id,sources:[s]}))});
 // legacy field names
 report.quarantined=report.quarantined.map(q=>({...q,sourceId:q.sourceId}));
 report.failures=report.failures.map(f=>({...f,sourceId:f.itemId}));
 if(report.status==="all_items_quarantined_or_blocked")report.status=report.blocked.length?"all_sources_blocked":"all_sources_quarantined";
 report.provider=report.provider.id;
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
