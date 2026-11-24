import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {planFiveTasks,MODELS} from "../research-tools/ai-assist/multitask-science.mjs";
import {planMultitaskRecheck,executeMultitaskRecheck,RECHECK_MODEL} from "../research-tools/ai-assist/multitask-recheck.mjs";
const plan=planFiveTasks(JSON.parse(await readFile(new URL("../research/ai/evaluation-set-v1.json",import.meta.url))));
const expected=x=>{
 const r=x.reference;
 switch(x.task){
 case "claim-extraction":return r.claims.map(c=>({direction:c.direction,endpointLevel:c.endpointLevel}));
 case "source-classification":return [{design:r.acceptable[0]}];
 case "mechanism-tagging":return r.mechanisms.map(mechanismId=>({mechanismId}));
 case "evidence-gap-detection":return Object.entries(r.stages).map(([stage,status])=>({stage,status}));
 case "contradiction-detection":return [{relation:r.relation}];
 }
};
const report=(x,m,pass=true)=>({task:x.task,model:m,provider:{boundary:"local"},totals:{requests:1},
 results:[{itemId:x.id,status:pass?"valid_pending_review":"partially_valid_pending_review",servedModel:m,rejected:pass?0:1,acceptedItems:expected(x)}]});
const fixture=()=>({classification:"PRIVATE_FIVE_TASK_INTERNAL_DIAGNOSTIC",datasetSha256:plan.datasetSha256,selectionSha256:plan.selectionSha256,
 publicationAuthorised:false,independentScientificValidation:false,cloudCalls:0,paidCalls:0,
 results:plan.items.map(x=>({itemId:x.id,task:x.task,scores:[]})),
 privatePanels:plan.items.map((x,i)=>({decision:{task:x.task,outcomes:[{itemId:x.id}]},
 privateReports:MODELS.map((m,j)=>({...{model:m.id,family:m.family},report:report(x,m.id,!(i===2||i===3&&j===1))}))}))});
const candidate=async m=>({...m,provider:{kind:"local",boundary:"local",model:m.id},config:{kind:"local",runtime:"ollama",localApi:"native",baseUrl:"http://127.0.0.1:11434",maxRequests:1}});
test("recomputes original scores, schedules only incomplete tasks, ignores claimed baseline score",()=>{
 const b=fixture();b.results.forEach(x=>x.scores=[{completeReferenceMatch:true}]);
 const p=planMultitaskRecheck({plan,baseline:b});
 assert.equal(p.maxLogicalInvocations,2);assert.deepEqual(p.items.filter(x=>x.needsRecheck).map(x=>x.task),["mechanism-tagging","evidence-gap-detection"]);
});
test("refuses mismatched provenance, swapped panels, cloud route or changed baseline scope",()=>{
 for(const mutate of [b=>b.datasetSha256="bad",b=>b.privatePanels.reverse(),b=>b.privatePanels[0].privateReports[0].report.provider.boundary="cloud",b=>b.publicationAuthorised=true,b=>b.paidCalls=1]){
  const b=fixture();mutate(b);assert.throws(()=>planMultitaskRecheck({plan,baseline:b}));
 }
});
test("source-only recheck preserves initial scores and never grants publication permission",async()=>{
 const b=fixture(),snapshot=JSON.stringify(b);let calls=0;
 const r=await executeMultitaskRecheck({plan,baseline:b,makeCandidate:candidate,vocab:{},runTask:async({task,items,provider})=>{
  calls++;assert.equal(items.length,1);assert.ok(!("reference" in items[0]));assert.ok(!("initialScores" in items[0]));
  return report(plan.items.find(x=>x.task===task),provider.model);
 }});
 assert.equal(calls,2);assert.equal(r.logicalCalls,2);assert.equal(r.completeReferenceMatchesAfterRecheck,2);
 assert.equal(r.recheckFamilyDistinctFromBothInitialFamilies,false);assert.equal(r.publicationAuthorised,false);assert.equal(JSON.stringify(b),snapshot);
});
test("partial recheck cannot be counted as complete and failed task remains open",async()=>{
 const r=await executeMultitaskRecheck({plan,baseline:fixture(),makeCandidate:candidate,vocab:{},runTask:async({task})=>report(plan.items.find(x=>x.task===task),RECHECK_MODEL.id,false)});
 assert.equal(r.completeReferenceMatchesAfterRecheck,0);
 assert.ok(r.results.filter(x=>x.recheck).every(x=>x.status==="unresolved_after_bounded_recheck"));
});
test("budget and exact native model route enforced",async()=>{
 const never=()=>{throw Error("unexpected call")};
 await assert.rejects(executeMultitaskRecheck({plan,baseline:fixture(),makeCandidate:async m=>({...await candidate(m),provider:{model:"other",kind:"local",boundary:"local"}}),runTask:never}),/route refused/);
 await assert.rejects(executeMultitaskRecheck({plan,baseline:fixture(),makeCandidate:candidate,runTask:async()=>({totals:{requests:2}})}),/budget exceeded/);
});
