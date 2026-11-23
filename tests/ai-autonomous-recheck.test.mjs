import test from "node:test";
import assert from "node:assert/strict";
import {needsAutonomousRecheck,buildRecheckMessages,validateRecheckReply,
 mergeAutonomousRechecks} from "../research-tools/ai-assist/autonomous-recheck.mjs";
const item={id:"claim:E08",task:"claim-extraction",sources:[{
 id:"E08",url:"https://doi.org/10.1093/qje/qjz013",
 text:"The eligible group's benefit receipt increased from 6% to 18% following application assistance.",
 dataClass:"public_research_metadata"}]};
const vocab={mechanismIds:[],endpointLevels:["receipt","application"]};
const raw=JSON.stringify({claims:[{
 sourceId:"E08",statement:"Benefit receipt increased from 6% to 18%.",
 quote:"The eligible group's benefit receipt increased from 6% to 18% following application assistance.",
 endpointLevel:"receipt",direction:"supports",mechanismIds:[],confidence:0.7
}],abstain:false,abstainReason:""});
const base={schema:"hpi_ai6_autonomous_research_cycle_v1",
 outcomes:[{itemId:"claim:E08",status:"unresolved_requires_more_AI_evidence",
  models:[{coarseLabels:["E08|receipt|supports"],flags:[]},
   {coarseLabels:["E08|application|supports"],flags:[]}],
  critic:{valid:true,verdict:"supported",flags:[]},
  possibleSevereReversal:false,publishable:false}],
 candidateCount:0,unresolvedCount:1,independentScientificValidation:false,
 publishable:false};
test("only unresolved or failed cases get another bounded local challenge",()=>{
 assert.equal(needsAutonomousRecheck(base.outcomes[0]),true);
 assert.equal(needsAutonomousRecheck({status:"source_grounded_candidate_pending_primary_verification"}),false);
 assert.equal(needsAutonomousRecheck({status:"quarantined_for_automated_evidence_check"}),false);
});
test("source-only recheck does not leak previous model candidates or gold labels",()=>{
 const m=buildRecheckMessages({item,vocab});
 assert.equal(m.length,2);
 assert.match(m[0].content,/Previous rounds had conflicting or missing/);
 assert.match(m[0].content,/abstain=true/);
 assert.ok(!JSON.stringify(m).includes("E08|application|supports"));
});
test("repaired JSON must still validate cited quote and numerical grounding",()=>{
 const v=validateRecheckReply({item,raw,model:"qwen3.5:9b",vocab});
 assert.equal(v.status,"valid_pending_review");
 assert.equal(v.acceptedItems.length,1);
 const ungrounded=JSON.stringify({claims:[{
  ...JSON.parse(raw).claims[0],
  statement:"Benefit receipt increased 1000% in one day."
 }],abstain:false,abstainReason:""});
 const rejected=validateRecheckReply({item,raw:ungrounded,model:"qwen3.5:9b",vocab});
 assert.equal(rejected.acceptedItems.length,0);
 assert.ok(rejected.rejected.length>0);
});
test("autonomous recheck convergence remains explicitly unverified",()=>{
 const validated=validateRecheckReply({item,raw,model:"qwen3.5:9b",vocab});
 const end=mergeAutonomousRechecks({decision:base,rechecks:[validated]});
 assert.equal(end.outcomes[0].status,"recheck_converged_pending_primary_verification");
 assert.equal(end.outcomes[0].recheck.matchesAnInitialIndependentPass,true);
 assert.equal(end.candidateCount,1);
 assert.equal(end.independentScientificValidation,false);
 assert.equal(end.publishable,false);
 assert.equal(end.secondPassDidNotCreateIndependentTruth,true);
});
test("an unsupported or unchanged second-pass outcome cannot fabricate convergence",()=>{
 const broken=mergeAutonomousRechecks({decision:base,rechecks:[{
  itemId:"claim:E08",model:"qwen3.5:9b",status:"failed",acceptedItems:[]
 }]});
 assert.equal(broken.outcomes[0].status,"unresolved_after_autonomous_recheck");
 assert.equal(broken.candidateCount,0);
 const unsafe=mergeAutonomousRechecks({decision:{
  ...base,outcomes:[{...base.outcomes[0],critic:{valid:false,verdict:"unavailable",flags:[]}}]
 },rechecks:[validateRecheckReply({item,raw,model:"qwen3.5:9b",vocab})]});
 assert.equal(unsafe.outcomes[0].status,"unresolved_after_autonomous_recheck");
 assert.throws(()=>mergeAutonomousRechecks({decision:base,rechecks:[
  {itemId:"claim:E08"},{itemId:"claim:E08"}]}),/Duplicate/);
});
