/** Five-task bounded diagnostic, NOT new independent gold evidence.
 * Fixed preregistered cases/models, private results, no cloud or paid routes.
 * Failure, abstention, partial output and missing results are not successes. */
import {createHash} from "node:crypto";
import {SCIENTIFIC_TASKS,runScientificPanel} from "./scientific-validation.mjs";
import {scanForInjection} from "./safeguards.mjs";
import {classifySource,checkRouting} from "./policy.mjs";
export const CASES=Object.freeze({
 "claim-extraction":"claim:E08",
 "source-classification":"classify:E08",
 "mechanism-tagging":"tag:E08",
 "evidence-gap-detection":"gaps:newham",
 "contradiction-detection":"pair:E08-E19"
});
export const MODELS=Object.freeze([
 Object.freeze({id:"qwen3.5:4b-q4_K_M",family:"qwen"}),
 Object.freeze({id:"nemotron-3-nano:4b",family:"nemotron"})
]);
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
export function planFiveTasks(dataset){
 if(!Array.isArray(dataset?.items)||hash(dataset.items)!==dataset.sha256)throw Error("Evaluation snapshot digest mismatch");
 const items=SCIENTIFIC_TASKS.map(task=>{
  const candidates=dataset.items.filter(x=>x.id===CASES[task]);
  const x=candidates[0];
  if(candidates.length!==1||x.task!==task||!x.reference||x.synthetic||
   x.sources?.length!==(task==="contradiction-detection"?2:1))throw Error("Fixed evaluation case missing or invalid");
  for(const s of x.sources){
   const c=classifySource(s);
   if(s.dataClass!=="public_research_metadata"||c.dataClass!=="public_research_metadata"||
    !checkRouting({dataClass:c.dataClass,boundary:"local"}).allowed||
    typeof s.text!=="string"||s.text.length<25||s.text.length>3000||scanForInjection(s.text).length)
    throw Error("Source safety gate refused");
  }
  // Only the item fields needed by the prompt pipeline, never reference answers.
  const {id,contextId,contextName}=x;
  return {task,id,reference:x.reference,input:{id,contextId,contextName,sources:x.sources.map(s=>({
   id:s.id,url:s.url,text:s.text,dataClass:s.dataClass,dataClassBasis:s.dataClassBasis}))}};
 });
 return {datasetSha256:dataset.sha256,items,selectionSha256:hash(items),
  plannedLogicalInvocations:items.length*MODELS.length,referenceType:"HPI_INTERNAL_CURATED_NOT_INDEPENDENT",
  independentScientificValidation:false,paidCalls:0,cloudCalls:0};
}
const sameSet=(a,b)=>a.length===b.length&&new Set(a).size===a.length&&new Set(b).size===b.length&&a.every(v=>b.includes(v));
export function scoreTaskCase({task,reference,report,itemId,model}){
 const rows=report?.results?.filter(x=>x.itemId===itemId)??[];
 const row=rows[0];
 const valid=rows.length===1&&row.status==="valid_pending_review"&&row.servedModel===model&&
  row.rejected===0&&Array.isArray(row.acceptedItems)&&row.acceptedItems.length>0&&
  !report.quarantined?.some(x=>x.itemId===itemId)&&!report.blocked?.some(x=>x.itemId===itemId);
 if(!valid)return {status:row?.status??"not_run",completeReferenceMatch:false,acceptedCount:row?.acceptedItems?.length??0,reason:"incomplete_or_unvalidated_output"};
 const a=row.acceptedItems;
 let match=false;
 if(task==="claim-extraction")match=sameSet(a.map(c=>c.direction+"|"+c.endpointLevel),reference.claims.map(c=>c.direction+"|"+c.endpointLevel));
 if(task==="source-classification")match=a.length===1&&reference.acceptable.includes(a[0].design);
 if(task==="mechanism-tagging")match=sameSet(a.map(c=>c.mechanismId),reference.mechanisms);
 if(task==="evidence-gap-detection")match=sameSet(a.map(c=>c.stage+"|"+c.status),Object.entries(reference.stages).map(x=>x.join("|")));
 if(task==="contradiction-detection")match=a.length===1&&a[0].relation===reference.relation;
 return {status:row.status,completeReferenceMatch:match,acceptedCount:a.length,reason:match?"matches_internal_reference":"internal_reference_mismatch"};
}
export async function runFiveTasks({plan,makeCandidate,vocab,runPanel=runScientificPanel,onTask=()=>{}}){
 if(plan?.items?.length!==5||plan.plannedLogicalInvocations!==10||hash(plan.items)!==plan.selectionSha256)throw Error("Invalid bounded plan");
 const results=[],privatePanels=[];
 for(const x of plan.items){
  if(CASES[x.task]!==x.id||x.input.id!==x.id||"reference" in x.input)throw Error("Case plan mismatch");
  const candidates=[];
  for(const m of MODELS){
   const c=await makeCandidate(m,x.task);
   if(c.id!==m.id||c.family!==m.family||c.provider?.model!==m.id||c.provider?.kind!=="local"||
    c.provider?.boundary!=="local"||c.config?.kind!=="local"||c.config?.runtime!=="ollama"||
    c.config?.localApi!=="native"||c.config?.baseUrl!=="http://127.0.0.1:11434"||c.config.maxRequests!==1)
    throw Error("Exact local route refused");
   candidates.push(c);
  }
  const p=await runPanel({task:x.task,items:[x.input],candidates,vocab,maxModels:2});
  const scores=MODELS.map(m=>{
   const entry=p.privateReports.find(r=>r.model===m.id);
   return {model:m.id,family:m.family,...scoreTaskCase({task:x.task,reference:x.reference,report:entry?.report,itemId:x.id,model:m.id})};
  });
  const logicalCalls=p.privateReports.reduce((n,r)=>n+r.report.totals.requests,0);
  if(logicalCalls>2)throw Error("Logical call budget exceeded");
  const panelInterpretation=p.decision.outcomes[0]?.interpretation??"unknown";
  const row={task:x.task,itemId:x.id,logicalCalls,scores,panelInterpretation,
   interpretation:scores.some(s=>s.reason==="incomplete_or_unvalidated_output")?"partial_or_unvalidated_output":panelInterpretation,
   nextAction:scores.every(s=>s.completeReferenceMatch)?"expand_independent_evaluation":"autonomous_source_and_model_recheck_required",
   scientificValidation:false};
  results.push(row);privatePanels.push(p);onTask(row);
 }
 return {classification:"PRIVATE_FIVE_TASK_INTERNAL_DIAGNOSTIC",datasetSha256:plan.datasetSha256,selectionSha256:plan.selectionSha256,
  models:MODELS,results,logicalCalls:results.reduce((n,r)=>n+r.logicalCalls,0),
  referenceMatches:MODELS.map(m=>({model:m.id,matches:results.filter(r=>r.scores.find(s=>s.model===m.id)?.completeReferenceMatch).length,denominator:5})),
  distinctModelFamilies:2,independentScientificValidation:false,publicationAuthorised:false,
  referenceType:plan.referenceType,cloudCalls:0,paidCalls:0,privatePanels};
}
