/** Bounded source-only recheck of the five-task internal diagnostic.
 * Never overwrite the baseline, expose its answers to the next model,
 * or use internal reference agreement as scientific validation. */
import {createHash} from "node:crypto";
import {MODELS,CASES,scoreTaskCase} from "./multitask-science.mjs";
import {runResearchTask} from "./assistant.mjs";
import {scanForInjection} from "./safeguards.mjs";
import {classifySource,checkRouting} from "./policy.mjs";
export const RECHECK_MODEL=Object.freeze({id:"qwen3.5:9b",family:"qwen"});
const sha=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
export function planMultitaskRecheck({plan,baseline}){
 if(plan?.items?.length!==5||sha(plan.items)!==plan.selectionSha256||
  baseline?.classification!=="PRIVATE_FIVE_TASK_INTERNAL_DIAGNOSTIC"||
  baseline.datasetSha256!==plan.datasetSha256||baseline.selectionSha256!==plan.selectionSha256||
  baseline.privatePanels?.length!==5||baseline.results?.length!==5||
  baseline.publicationAuthorised!==false||baseline.independentScientificValidation!==false||
  baseline.cloudCalls!==0||baseline.paidCalls!==0)throw Error("Baseline provenance or scope mismatch");
 const items=plan.items.map((x,i)=>{
  if(CASES[x.task]!==x.id||x.input?.id!==x.id||"reference" in x.input||
   baseline.results[i]?.itemId!==x.id||baseline.results[i]?.task!==x.task)
   throw Error("Case alignment mismatch");
  const p=baseline.privatePanels[i];
  if(p?.privateReports?.length!==2||p.decision?.task!==x.task||
   p.decision?.outcomes?.length!==1||p.decision.outcomes[0].itemId!==x.id)
   throw Error("Baseline panel alignment mismatch");
  const scores=MODELS.map(m=>{
   const entries=p.privateReports.filter(r=>r.model===m.id&&r.family===m.family);
   const r=entries[0]?.report;
   if(entries.length!==1||r?.task!==x.task||r.provider?.boundary!=="local"||
    r.model!==m.id||r.totals?.requests!==1||r.results?.length!==1||
    r.results[0].itemId!==x.id)throw Error("Baseline model report mismatch");
   return {model:m.id,family:m.family,...scoreTaskCase({task:x.task,reference:x.reference,report:r,itemId:x.id,model:m.id})};
  });
  return {...x,initialScores:scores,needsRecheck:scores.some(s=>!s.completeReferenceMatch)};
 });
 return {items,sourcePlanSha256:plan.selectionSha256,baselineSha256:sha(baseline),
  selectionSha256:sha(items),maxLogicalInvocations:items.filter(x=>x.needsRecheck).length,
  referenceType:"HPI_INTERNAL_CURATED_NOT_INDEPENDENT"};
}
export async function executeMultitaskRecheck({plan,baseline,makeCandidate,vocab,runTask=runResearchTask,onTask=()=>{}}){
 const p=planMultitaskRecheck({plan,baseline});
 const results=[],privateRechecks=[];
 for(const x of p.items){
  if(!x.needsRecheck){results.push({task:x.task,itemId:x.id,initialScores:x.initialScores,recheck:null,
   status:"initial_complete_internal_matches",scientificValidation:false});continue}
  for(const s of x.input.sources){
   const c=classifySource(s);
   if(s.dataClass!=="public_research_metadata"||c.dataClass!=="public_research_metadata"||
    !checkRouting({dataClass:c.dataClass,boundary:"local"}).allowed||scanForInjection(s.text).length||
    typeof s.text!=="string"||s.text.length<25||s.text.length>3000)throw Error("Source safety gate refused");
  }
  const c=await makeCandidate(RECHECK_MODEL,x.task);
  if(c.id!==RECHECK_MODEL.id||c.family!==RECHECK_MODEL.family||
   c.provider?.model!==RECHECK_MODEL.id||c.provider?.boundary!=="local"||c.provider?.kind!=="local"||
   c.config?.kind!=="local"||c.config?.runtime!=="ollama"||c.config?.localApi!=="native"||
   c.config?.baseUrl!=="http://127.0.0.1:11434"||c.config.maxRequests!==1)
   throw Error("Exact native recheck route refused");
  // Only the original sanitized input is passed to the research runner.
  const report=await runTask({task:x.task,items:[x.input],provider:c.provider,config:c.config,vocab});
  if(!Number.isInteger(report.totals?.requests)||report.totals.requests<0||report.totals.requests>1)throw Error("Recheck budget exceeded");
  const score=scoreTaskCase({task:x.task,reference:x.reference,report,itemId:x.id,model:c.id});
  const row={task:x.task,itemId:x.id,initialScores:x.initialScores,
   recheck:{model:c.id,family:c.family,logicalCalls:report.totals.requests,...score},
   status:score.completeReferenceMatch?"recheck_matches_internal_reference_not_validation":"unresolved_after_bounded_recheck",
   nextAction:score.completeReferenceMatch?"expand_source_verified_evaluation":"review_source_scope_and_escalate_model_if_authorised",
   scientificValidation:false};
  results.push(row);privateRechecks.push({itemId:x.id,report});onTask(row);
 }
 return {classification:"PRIVATE_MULTITASK_SOURCE_ONLY_RECHECK",sourcePlanSha256:p.sourcePlanSha256,
  baselineSha256:p.baselineSha256,selectionSha256:p.selectionSha256,referenceType:p.referenceType,
  results,logicalCalls:results.reduce((n,x)=>n+(x.recheck?.logicalCalls??0),0),
  scheduledRechecks:p.maxLogicalInvocations,completeReferenceMatchesAfterRecheck:results.filter(x=>x.recheck?.completeReferenceMatch).length,
  initialScoresPreserved:true,recheckFamilyDistinctFromBothInitialFamilies:false,
  independentScientificValidation:false,publicationAuthorised:false,paidCalls:0,cloudCalls:0,privateRechecks};
}
