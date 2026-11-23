/**
 * Bounded AI-only second pass: disputed cases are challenged again with a
 * fresh source-grounded prompt, NEVER with other model answers as instructions.
 * A self-corrected match is still NOT independently verified science.
 */
import {buildGroundedMessages,VALIDATORS} from "./safeguards.mjs";
const SUPPORTED=new Set(["valid_pending_review","partially_valid_pending_review"]);
const labels=items=>[...new Set(items.map(x=>[x.sourceId,x.endpointLevel,x.direction].join("|")))].sort();
const exact=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
export function needsAutonomousRecheck(outcome){
 return outcome?.status==="unresolved_requires_more_AI_evidence"||
  outcome?.status==="partial_or_failed"||
  outcome?.status==="critic_unavailable_unresolved";
}
export function buildRecheckMessages({item,vocab}){
 if(!item||item.task!=="claim-extraction")throw Error("Unsupported recheck task");
 const messages=buildGroundedMessages(item.task,
  item.sources.map(s=>({id:s.id,url:s.url,text:s.text})),
  {allowedMechanismIds:vocab.mechanismIds,endpointLevels:vocab.endpointLevels});
 messages[0]={...messages[0],content:messages[0].content+
  "\nSECOND INDEPENDENT SOURCE-ONLY CHECK. Previous rounds had conflicting or missing extracted categories. Do NOT use or infer their answers. Focus strictly on which specific endpoint the source actually measured; distinguish receipt from application and participation, and distinguish a null finding from support. A study summary without a clearly supported quote must produce abstain=true. No policy implications. Reply valid JSON following the schema."};
 return messages;
}
export function validateRecheckReply({item,raw,model,vocab}){
 const result=VALIDATORS[item.task](raw,
  item.sources.map(s=>({id:s.id,url:s.url,text:s.text})),
  {allowedMechanismIds:vocab.mechanismIds,endpointLevels:vocab.endpointLevels,
   provenance:{model,kind:"autonomous_source_only_second_pass",
    published:false,externallyVerified:false}});
 return {itemId:item.id,model,status:result.status,
  acceptedItems:result.accepted.map(x=>{
   const {provenance:_p,...y}=x;return y;
  }),rejected:result.rejected.map(x=>x.reasons),
  sourceSha256:null,independentScientificReview:false};
}
export function mergeAutonomousRechecks({decision,rechecks}){
 if(!decision||!Array.isArray(decision.outcomes)||!Array.isArray(rechecks))
  throw Error("Invalid recheck decision state");
 if(new Set(rechecks.map(x=>x.itemId)).size!==rechecks.length)
  throw Error("Duplicate recheck result");
 const byId=new Map(rechecks.map(x=>[x.itemId,x]));
 const outcomes=decision.outcomes.map(x=>{
  const r=byId.get(x.itemId);
  if(!needsAutonomousRecheck(x))return {...x,recheck:{attempted:false,reason:"not_applicable"}};
  if(!r)return {...x,status:"unresolved_no_recheck",
   recheck:{attempted:false,reason:"not_attempted"},publishable:false};
  const accepted=Array.isArray(r.acceptedItems)?r.acceptedItems:[];
  const second=labels(accepted);
  const hasMatch=SUPPORTED.has(r.status)&&second.length>0&&
   x.models.some(m=>exact(m.coarseLabels,second));
  const criticOkay=x.critic?.valid===true&&x.critic?.verdict==="supported"&&
   x.critic.flags?.length===0;
  const safeToCategorise=hasMatch&&criticOkay&&!x.possibleSevereReversal&&
   x.models.every(m=>m.flags.length===0);
  return {...x,
   status:safeToCategorise?
    "recheck_converged_pending_primary_verification":
    "unresolved_after_autonomous_recheck",
   nextAction:safeToCategorise?"verify_primary_publication":
    "autonomous_primary_source_retrieval_and_method_challenge",
   recheck:{attempted:true,model:r.model,
    status:r.status,returnedCandidateCount:accepted.length,
    matchesAnInitialIndependentPass:hasMatch,criticPreviouslySupported:criticOkay,
    establishesScientificTruth:false},
   publishable:false,originalPublicationVerified:false};
 });
 return {...decision,outcomes,
  candidateCount:outcomes.filter(x=>[
   "recheck_converged_pending_primary_verification",
   "source_grounded_candidate_pending_primary_verification"
  ].includes(x.status)).length,
  unresolvedCount:outcomes.filter(x=>![
   "recheck_converged_pending_primary_verification",
   "source_grounded_candidate_pending_primary_verification"
  ].includes(x.status)).length,
  independentScientificValidation:false,publishable:false,
  secondPassDidNotCreateIndependentTruth:true};
}
