/**
 * HPI-AI.6-T07.3 — reproducible original publisher-DEPOSITED ABSTRACT audit.
 *
 * All source text is processed in memory, NEVER persisted, logged or sent to
 * cloud AI. Only SHA-256, field-level derived numeric facts and offsets remain.
 * An abstract is not the full study; a reported figure is not replicated data.
 *
 * Every evidence type has an explicit, conservative extraction template.
 * Unsupported methods/outcomes abstain: do NOT fake general-purpose NLP.
 */
import {createHash} from "node:crypto";
const digest=x=>createHash("sha256").update(x).digest("hex");
const pct=s=>Number(String(s).replace("%",""));
const finiteRate=n=>Number.isFinite(n)&&n>=0&&n<=100;
const norm=s=>String(s).toLowerCase().replace(/\s+/g," ").trim();
const freezeNum=n=>Number(n.toFixed(5));
const xmlToText=xml=>{
 if(typeof xml!=="string"||xml.length>50_000||/<!doctype|<!entity|<script\b/i.test(xml))
  return null;
 // JATS abstracts only; no DOM, XML external entities or URL fetching.
 // Common text entities are decoded for context classification in memory.
 const text=xml.replace(/<[^>]*>/g," ")
  .replace(/&nbsp;|&#160;/gi," ")
  .replace(/&amp;/gi,"&")
  .replace(/&#(?:39|8217);|&apos;|&rsquo;/gi,"'")
  .replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
  .replace(/\s+/g," ").trim();
 return text.length<70||text.length>35_000?null:text;
};
function pctGroups(text){
 // Requires explicit "X% of the Y group", never pairs arbitrary percentages.
 const regex=/\b(\d{1,3}(?:\.\d+)?)\s*%\s+of\s+the\s+(.{2,90}?)\s+group\b/gi;
 const matches=[];
 for(const m of text.matchAll(regex)){
  const rate=pct(m[1]),group=norm(m[2]).replace(/[^a-z0-9 ]/g,"")
   .replace(/\s+/g,"_").slice(0,70);
  if(!finiteRate(rate)||!group||group.includes("percent"))continue;
  matches.push({group,ratePercent:rate,abstractOffset:m.index});
  if(matches.length>=15)break;
 }
 return matches;
}
const parseSampleSize=text=>{
 const m=/\b(\d{1,3}(?:,\d{3})+)\s+(?:elderly\s+)?individuals\b/i.exec(text);
 if(m)return {count:Number(m[1].replace(/,/g,"")),unit:"individuals",
  provenance:"registered_abstract_text",abstractOffset:m.index};
 const n=/\b(\d+(?:\.\d+)?)\s+million\s+observations\b/i.exec(text);
 if(n)return {count:Number(n[1])*1_000_000,unit:"observations_not_unique_individuals",
  provenance:"registered_abstract_text",abstractOffset:n.index};
 return null;
};
function followUp(text){
 const numberWords={one:1,two:2,three:3,four:4,five:5,six:6,
  seven:7,eight:8,nine:9,ten:10,twelve:12};
 const m=/\b(?:over\s+the\s+next\s+|after\s+)(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+months?\b/i.exec(text);
 if(!m)return null;
 return {months:Number(m[1])||numberWords[m[1].toLowerCase()]||null,
  abstractOffset:m.index,claimWindow:"reported_followup_not_individual_arm_exposure"};
};
function nullFinding(text){
 // A precise negative research claim is "we find no evidence ...".
 // Critically, "no evidence of an effect" !== mathematically zero effect.
 const m=/\bwe\s+find\s+no\s+evidence\s+that\s+they\s+affected\s+households[’']?\s+likelihood\s+of\s+filing\s+a\s+tax\s+return\s+or\s+claiming\s+the\s+credit\b/i.exec(text);
 if(!m)return null;
 return {
  reportedDirection:"authors_report_no_evidence_of_detectable_effect",
  endpointLabels:["filing_tax_return","claiming_eitc_credit"],
  distinctOutcomeCount:2,notExactZeroEffect:true,
  noEffectSizeEstimatedFromAbstract:true,
  abstractOffset:m.index
 };
}
function design(text){
 return {
  randomisedFieldExperiment:/\brandomi[sz]ed\s+field\s+experiment\b/i.test(text),
  preregisteredFieldExperiments:/\b(?:preregistered|pre-registered).*?\bfield\s+experiments\b/i.test(text),
  experimentCount:(()=>{const m=/\b(six|6)\s+(?:preregistered|pre-registered).*?\bfield\s+experiments\b/i.exec(text);return m?6:null})(),
  notes:"Design descriptors only; risk of bias, attrition and balance not extracted from abstract"
 };
}
function compareSummaryRates(summary,groups){
 const tokens=[...new Set([...String(summary).matchAll(/\b(\d{1,3}(?:\.\d+)?)\s*%/g)]
  .map(m=>Number(m[1])))];
 const sourceUnique=[...new Set(groups.map(x=>x.ratePercent))];
 const absent=tokens.filter(x=>!sourceUnique.includes(x));
 // Only treat mismatch as hard failure if user summary makes explicit "X% group"
 // claims and the original contains at least two labelled groups. Other
 // percentages (confidence, costs, years) require human/AI semantic comparison.
 const summaryGroupClaims=pctGroups(summary);
 const mismatches=summaryGroupClaims.filter(x=>{
  const matching=groups.find(y=>y.group===x.group);
  return matching&&matching.ratePercent!==x.ratePercent;
 });
 return {summaryPercentTokens:tokens.length,
  summaryPercentTokensNotInSourceGroups:absent.length,
  labelledGroupMismatches:mismatches.length,
  mismatchGroups:mismatches.map(x=>x.group),
  noClaimLevelScientificProof:true};
}
function computeDeltas(groups,text){
 // Deterministically compute differences only if source explicitly has a
 // "control group" and SNAP enrolment context; never infer significance.
 if(!/\bSNAP\b/.test(text)||!/\benrolls?\s+in\s+SNAP\b/i.test(text))
  return {computable:false,reason:"outcome_not_proven_to_be_snap_enrolment"};
 const control=groups.find(x=>x.group==="control");
 if(!control||groups.length<2)return {computable:false,reason:"missing_labelled_comparator"};
 return {computable:true,method:"arithmetic_recalculation_from_abstract_reported_rates",
  endpoint:"SNAP_enrolment",controlPercent:control.ratePercent,
  comparisons:groups.filter(x=>x.group!=="control").map(x=>({
   intervention:x.group,reportedRatePercent:x.ratePercent,
   absoluteDifferencePercentagePoints:freezeNum(x.ratePercent-control.ratePercent),
   relativeRateRatio:control.ratePercent===0?null:freezeNum(x.ratePercent/control.ratePercent),
   statisticalSignificanceTested:false,perArmDenominatorsKnown:false
  })),
  isIndependentExperimentalReplication:false,
  confidenceIntervalFromAbstract:null};
}
/**
 * Evidence extraction is strictly from the deposited abstract, not a model.
 * Text never leaves this function (only exact original SHA and derived facts).
 */
export function auditPublisherDepositedAbstract({doi,summaryText="",abstractXml}={}){
 const text=xmlToText(abstractXml);
 if(!text)return {
  kind:"publisher_deposited_abstract",doi,available:false,
  reason:"abstract_missing_or_invalid",originalStudyFullTextRead:false,
  primaryFindingScientificallyValidated:false,
  approvalToPublish:false,rawPublisherTextRetained:false
 };
 const groups=pctGroups(text);
 const nullReport=nullFinding(text);
 const d=design(text);
 const metrics=computeDeltas(groups,text);
 const ratesCompare=compareSummaryRates(summaryText,groups);
 const follow=followUp(text),size=parseSampleSize(text);
 const documentedOutcome=metrics.computable?"snap_enrolment":
   nullReport?"tax_filing_and_eitc_claiming":null;
 const summary=norm(summaryText);
 const mismatchNull=Boolean(nullReport&&
  /\b(?:increased|raised|improved)\b.{0,60}\b(?:tax\s+filing|claiming|eitc)\b/i.test(summary));
 const mismatchedRates=ratesCompare.labelledGroupMismatches>0;
 const quarantined=Boolean(mismatchNull||mismatchedRates);
 return {kind:"publisher_deposited_abstract",doi,available:true,
  depositedAbstractSha256:digest(abstractXml),
  processedInMemory:true,rawPublisherTextRetained:false,
  originalStudyFullTextRead:false,rightsToStoreOrSendFullTextEstablished:false,
  design:d,sample:size,followUp:follow,
  outcome:documentedOutcome,
  nullEffectReport:nullReport,
  labelledRateGroups:groups,
  derivedComparisons:metrics,
  hpiSummaryComparison:ratesCompare,
  seriousSummaryContradictionDetected:quarantined,
  contradictionCodes:[
   ...(mismatchNull?["summary_reverses_null_report"]:[]),
   ...(mismatchedRates?["summary_misstates_labelled_group_rate"]:[])
  ],
  empiricalEffectScientificallyVerified:false,
  scientificMethodReproductionPerformed:false,
  primaryFindingScientificallyValidated:false,approvalToPublish:false,
  caution:"Original deposited publisher abstract only. Means/arms are quoted figures; derived deltas are arithmetic, NOT replicated statistical estimates or study methods."};
}
/**
 * Fail closed if a summary directly reverses a known null effect or cites
 * a wrong arm rate. Missing abstract/fields lead to continued uncertainty,
 * not invented positive validation.
 */
export function enforceAbstractIntegrityGate(registry,items){
 if(!Array.isArray(registry?.items)||!Array.isArray(items))
  throw Error("No source audit available");
 for(const item of items){
  const r=registry.items.find(x=>x.itemId===item.id);
  if(!r||!r.abstractClaimAudit)throw Error("Original abstract audit missing "+item.id);
  if(r.abstractClaimAudit.seriousSummaryContradictionDetected)
   throw Error("Original abstract contradicts HPI summary "+item.id);
 }
 return true;
}

/**
 * Check model-proposed endpoint/direction against the original deposited
 * abstract's derived facts. Still not a full-paper methods or data audit.
 */
export function compareAgentClaimsWithOriginalAbstract({record,decision}){
 if(!record?.schema||!Array.isArray(record.items)||!Array.isArray(decision?.outcomes))
  throw Error("Missing original-source checks or AI decision");
 const audited=decision.outcomes.map(o=>{
  const evidence=record.items.find(x=>x.itemId===o.itemId);
  if(!evidence?.identityConfirmedByTwoCatalogues)
   throw Error("No independently corroborated primary DOI for "+o.itemId);
  const source=evidence.abstractClaimAudit;
  if(!source||source.seriousSummaryContradictionDetected)
   throw Error("Original source audit refused "+o.itemId);
  const issues=[];
  for(const m of o.models||[]){
   for(const entry of m.coarseLabels||[]){
    const fields=entry.split("|");
    if(fields.length!==3)continue;
    const endpoint=fields[1],direction=fields[2];
    if(source.outcome==="snap_enrolment"&&endpoint==="sustained_participation")
     issues.push({model:m.model,code:"original_abstract_does_not_measure_sustained_participation"});
    if(source.outcome==="tax_filing_and_eitc_claiming"&&endpoint==="receipt")
     issues.push({model:m.model,code:"claiming_tax_credit_not_equivalent_to_receiving_payment"});
    if(source.nullEffectReport&&direction==="supports")
     issues.push({model:m.model,code:"model_reverses_original_reported_null_result"});
   }
  }
  const severe=issues.some(i=>i.code==="model_reverses_original_reported_null_result");
  // A second-pass match cannot erase an earlier source mismatch.
  let status=o.status;
  if(severe)status="quarantined_original_abstract_null_reversal";
  else if(issues.length&&status==="recheck_converged_pending_primary_verification")
   status="source_candidate_with_original_abstract_endpoint_dispute";
  return {...o,status,originalAbstractAudit:{
   auditAvailable:source.available,
   originalDOI:evidence.doi,
   depositedAbstractSha256:source.depositedAbstractSha256??null,
   empiricalEffectScientificallyVerified:false,
   methodsAndStatisticalInferenceVerified:false,
   reportSource:"publisher_deposited_crossref_abstract_only",
   reportedOutcome:source.outcome,
   rateComparisons:source.derivedComparisons?.computable?
    source.derivedComparisons.comparisons:[],
   authorsNullReportNotExactZero:source.nullEffectReport?.notExactZeroEffect??null,
   reportedTotalSample:source.sample,
   followUp:source.followUp,
   contradictionCodes:issues,
   originalPublisherTextRetained:false,readyForPublication:false
  },nextAction:severe?"autonomous_original_methods_urgent_recheck":
    issues.length?"resolve_endpoint_from_licensed_original_methods":o.nextAction,
   publishable:false,originalPublicationVerified:false};
 });
 const positive=new Set(["source_grounded_candidate_pending_primary_verification",
  "recheck_converged_pending_primary_verification",
  "source_candidate_with_original_abstract_endpoint_dispute"]);
 return {...decision,outcomes:audited,
  candidateCount:audited.filter(o=>positive.has(o.status)).length,
  unresolvedCount:audited.filter(o=>!positive.has(o.status)).length,
  independentScientificValidation:false,publishable:false,
  sourceAuditLevel:"original_publisher_deposited_abstract_not_full_study",
  originalResultsReproducedFromRawData:0,
  abstractArithmeticChecks:audited.reduce((n,o)=>
   n+(o.originalAbstractAudit.rateComparisons?.length||0),0)};
}
