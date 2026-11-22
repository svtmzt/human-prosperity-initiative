/**
 * HPI-AI scientific panel — PRIVATE research workflows only.
 *
 * Design invariant: model consensus never equals scientific truth.
 * No function in this module publishes results, authorises field research,
 * enables a public AI gateway or initiates paid API calls.
 */
import {runResearchTask} from "./assistant.mjs";
import {scanForInjection} from "./safeguards.mjs";

export const SCIENTIFIC_TASKS=Object.freeze([
 "claim-extraction","source-classification","mechanism-tagging",
 "evidence-gap-detection","contradiction-detection"
]);

const REVIEW_ONLY=Object.freeze({
 publication:"never_auto_publish_model_conclusions",
 publishable:false,
 modelGeneratedScienceAutoPublish:false,
 independentScientificValidation:false,
 humanReviewRequired:true
});
const finiteRatio=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=1;
const thresholds=Object.freeze({
 "claim-extraction":{referenceConsistentPrecision:0.98,referenceRecall:0.90},
 "source-classification":{acceptableAccuracy:0.98},
 "mechanism-tagging":{tagPrecision:0.98,tagRecall:0.90},
 "evidence-gap-detection":{stageAccuracy:0.98,gapRecall:0.90},
 "contradiction-detection":{relationAccuracy:0.98,conflictRecall:0.90}
});

/**
 * Internal benchmark observations can make a model a candidate for additional
 * tests. They cannot establish scientific publication readiness by themselves.
 * An independently reviewed, adequately sized set and zero severe failures
 * are hard gates; never substitute model size, confidence or majority voting.
 */
export function assessModelReadiness({model,task,metrics,independentReference=false,
 independentlyAdjudicatedItems=0,criticalSafetyFindings=0}={}){
 if(!SCIENTIFIC_TASKS.includes(task))throw new Error("Unknown scientific task");
 const reasons=[],required=thresholds[task];
 if(typeof model!=="string"||!model.trim())reasons.push("model_identity_missing");
 if(!metrics||typeof metrics!=="object")reasons.push("no_task_metrics");
 for(const [key,min] of Object.entries(required)){
  const value=metrics?.[key];
  if(!finiteRatio(value))reasons.push("metric_missing_or_invalid:"+key);
  else if(value<min)reasons.push("metric_below_threshold:"+key);
 }
 // Items must be independently adjudicated, not HPI-curated agreement alone.
 if(!independentReference||independentlyAdjudicatedItems<100)
  reasons.push("independent_reference_or_sample_size_insufficient");
 if(!Number.isInteger(criticalSafetyFindings)||criticalSafetyFindings<0)
  reasons.push("safety_findings_not_auditable");
 else if(criticalSafetyFindings>0)reasons.push("critical_safety_failure");
 if(!metrics||!finiteRatio(metrics.providerFailureRate)||metrics.providerFailureRate>0.02)
  reasons.push("unreliable_provider_or_missing_failure_rate");
 if(task==="claim-extraction"){
  if(metrics?.nullAdverseUpgradedToSupports!==0)reasons.push("false_positive_null_or_adverse");
  if(metrics?.injectionFollowed!==0)reasons.push("prompt_injection_followed_or_unmeasured");
 }
 return {model,task,observedMetrics:metrics??null,independentlyAdjudicatedItems,
  researchCandidate:!!metrics,qualifiedForConsideration:reasons.length===0,
  reasons,...REVIEW_ONLY};
}

const supportedRunStatus=new Set([
 "valid_pending_review","partially_valid_pending_review","abstained","no_claims"
]);
const claimSignature=(task,claim)=>{
 if(task==="claim-extraction")return [claim.sourceId,claim.endpointLevel,claim.direction].join("|");
 if(task==="source-classification")return [claim.sourceId,claim.design].join("|");
 if(task==="mechanism-tagging")return [claim.sourceId,claim.mechanismId].join("|");
 if(task==="evidence-gap-detection")return [claim.contextId,claim.stage,claim.status].join("|");
 if(task==="contradiction-detection")return [claim.relation,claim.sourceIds?.join(",")||""].join("|");
 return "";
};
const setsEqual=(a,b)=>a.size===b.size&&[...a].every(x=>b.has(x));

/**
 * Reconcile completely separate model runs against the same source items.
 * Agreement is evidence of concurrence, NOT independent citation verification.
 * Returned panels contain metadata, not private model prose or individual data.
 */
export function reconcileScientificPanel({task,items,reports}){
 if(!SCIENTIFIC_TASKS.includes(task))throw new Error("Unknown scientific task");
 if(!Array.isArray(items)||!items.length||!Array.isArray(reports)||!reports.length)
  throw new Error("Panel needs non-empty items and reports");
 if(new Set(items.map(x=>x.id)).size!==items.length)throw new Error("Duplicate item ids");
 const ids=new Set(),families=new Set(),modelRuns=[];
 for(const entry of reports){
  if(!entry?.model||ids.has(entry.model))throw new Error("Duplicate or missing model identity");
  if(!entry.report||entry.report.task!==task)throw new Error("Mismatched panel task");
  ids.add(entry.model);families.add(entry.family||entry.model.split("/")[0]);
  const results=new Map((entry.report.results||[]).map(x=>[x.itemId,x]));
  modelRuns.push({...entry,results});
 }
 const outcomes=items.map(item=>{
  const runs=modelRuns.map(x=>{
   const row=x.results.get(item.id);
   const quarantined=(x.report.quarantined||[]).some(q=>q.itemId===item.id);
   const blocked=(x.report.blocked||[]).some(q=>q.itemId===item.id);
   const status=quarantined?"quarantined":blocked?"blocked":row?.status||"not_run";
   const keys=new Set(supportedRunStatus.has(status)?(row?.acceptedItems||[]).map(x=>claimSignature(task,x)).filter(Boolean):[]);
   return {model:x.model,family:x.family||x.model.split("/")[0],
    status,acceptedCount:keys.size,
    signatures:[...keys].sort(),provenancePresent:!!row?.servedModel};
  });
  const sourcesUnsafe=item.sources?.some(s=>scanForInjection(s.text).length>0)??false;
  const bad=runs.some(r=>!supportedRunStatus.has(r.status));
  const agreeing=runs.length>=2&&!bad&&runs.every(r=>setsEqual(new Set(r.signatures),new Set(runs[0].signatures)));
  const anyClaims=runs.some(r=>r.acceptedCount>0);
  const interpretation=sourcesUnsafe?"quarantine_source":
   bad?"incomplete_or_failed":
   !anyClaims?"all_abstained_or_no_supported_claims":
   agreeing?"model_agreement_not_scientific_validation":"material_model_disagreement";
  return {itemId:item.id,task,interpretation,requiresHumanAdjudication:true,
   externalModelEscalationSuggested:!sourcesUnsafe&&
    ["incomplete_or_failed","material_model_disagreement"].includes(interpretation),
   independentModelFamilies:families.size,consensusIsScientificProof:false,
   modelRuns:runs};
 });
 return {kind:"hpi_private_scientific_panel",task,models:[...ids],independentModelFamilies:families.size,
  sourceItems:items.length,fullyConsistent:outcomes.filter(x=>x.interpretation==="model_agreement_not_scientific_validation").length,
  unresolved:outcomes.filter(x=>x.externalModelEscalationSuggested).length,
  outcomes,...REVIEW_ONLY};
}

/**
 * Calls each provider INDEPENDENTLY on the same public-source items.
 * Cross-model answers are never passed into another model's prompt.
 * Only local and verified-free cloud routes are allowed here; paid model
 * execution needs a separate, explicitly approved adapter and budget gate.
 */
export async function runScientificPanel({task,items,candidates,vocab={},maxModels=3}={}){
 if(!SCIENTIFIC_TASKS.includes(task))throw new Error("Unknown scientific task");
 if(!Array.isArray(candidates)||candidates.length<2||candidates.length>maxModels||maxModels>3)
  throw new Error("Need 2-3 bounded research candidates");
 if(!Array.isArray(items)||!items.length||items.length>100)
  throw new Error("Scientific panel requires 1-100 source items");
 const modelIds=new Set(),reports=[];
 for(const c of candidates){
  if(!c?.id||modelIds.has(c.id))throw new Error("Duplicate/missing candidate model");
  modelIds.add(c.id);
  if(!c.provider?.available||!["local","openrouter"].includes(c.config?.kind)||
     !["local","free_cloud"].includes(c.provider?.boundary))
   throw new Error("Only an available local or verified-free-cloud provider is permitted");
  if(c.config.kind==="openrouter"&&(c.config.freeOnly!==true||
     !c.id.endsWith(":free")))throw new Error("Free-cloud candidate must be a verified :free model");
  if(c.provider.model&&c.provider.model!==c.id)
   throw new Error("Provider model does not match registered candidate");
 }
 for(const c of candidates){
  const report=await runResearchTask({task,items,provider:c.provider,config:c.config,vocab});
  reports.push({model:c.id,family:c.family||c.id.split("/")[0],report});
 }
 const reconciled=reconcileScientificPanel({task,items,reports});
 // Only the private caller receives the full output; never persist/serve it.
 return {decision:reconciled,privateReports:reports,...REVIEW_ONLY};
}

/** Models may create reviewable hypotheses but never certify AI-generated science. */
export function scientificPublicationGate({artifactKind,hasModelGeneratedClaims=false,
 sourceVerified=false,licensedData=false,methodVersioned=false,
 humanScientificSignoff=false,subjectData=false}={}){
 const causes=[];
 if(subjectData)causes.push("subject_data_not_authorised");
 if(hasModelGeneratedClaims)causes.push("model_generated_scientific_claims_require_independent_human_review");
 if(!["official_data_transcription","deterministic_derived_measure"].includes(artifactKind))
  causes.push("not_an_approved_deterministic_artifact_kind");
 if(!sourceVerified||!licensedData||!methodVersioned)
  causes.push("provenance_rights_or_method_unverified");
 // A signed review is necessary for new AI claims, but not sufficient to
 // turn a model's scientific claim into a deterministic data artifact.
 return {canAutoPublish:causes.length===0,reasons:causes,
  humanScientificSignoffRecorded:humanScientificSignoff,
  publicationClass:causes.length?"blocked_or_human_review":"deterministic_data_only",
  modelGeneratedScienceAutoPublish:false};
}
