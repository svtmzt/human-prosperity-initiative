/**
 * Free-model selection. Chooses the ordered list of models a run may use:
 * an explicitly configured model, or the tested defaults for the task from
 * research/ai/model-selection-policy.json, plus explicitly permitted free
 * fallbacks. Every entry must be verified_free in a FRESH catalogue. Paid,
 * zero-priced-but-not-free, router, ambiguous, expired, removed or excluded
 * models are refused. If nothing qualifies the run is refused; there is no
 * paid fallback path in this module.
 */
import {catalogFreshness,findModel} from "./catalog.mjs";

export function validateSelectionPolicy(policy){
 const errors=[];
 if(!policy||policy.kind!=="hpi_ai_model_selection_policy")errors.push("Not a model selection policy");
 if(!policy?.tasks||typeof policy.tasks!=="object")errors.push("Policy has no tasks");
 for(const [task,t] of Object.entries(policy?.tasks||{})){
  if(!Array.isArray(t.defaults))errors.push(task+": defaults must be an array");
  for(const id of [...(t.defaults||[]),...(t.permittedFallbacks||[])])if(!String(id).endsWith(":free"))errors.push(task+": "+id+" is not a ':free' variant");
 }
 for(const x of policy?.excluded||[])if(!x.id||!x.reason)errors.push("Excluded entries need id and reason");
 return errors;
}

function check(entry,id,excluded){
 if(!entry)return "Model "+id+" is not in the current catalogue (removed or renamed)";
 if(excluded.has(id))return "Model "+id+" is excluded by HPI policy: "+excluded.get(id);
 if(entry.costClass!=="verified_free")return "Model "+id+" is not verified free ("+entry.costClass+")";
 if(!entry.eligibleFreeText)return "Model "+id+" is not eligible: "+entry.ineligibleReasons.join("; ");
 return null;
}

/** Returns {ok, entries, reasons, origin}. */
export function selectModels(task,{catalog,policy,config,now=new Date()}){
 const reasons=[];
 if(!catalog)return {ok:false,entries:[],reasons:["No model catalogue available; run `npm run ai:discover` with network access"]};
 const f=catalogFreshness(catalog,{now,maxAgeHours:config.catalogMaxAgeHours||24});
 if(!f.fresh)return {ok:false,entries:[],reasons:[f.reason]};
 const excluded=new Map((policy?.excluded||[]).map(x=>[x.id,x.reason]));
 const taskPolicy=policy?.tasks?.[task]||{defaults:[],permittedFallbacks:[]};
 const entries=[];
 if(config.model){
  const e=findModel(catalog,config.model),why=check(e,config.model,excluded);
  if(why)return {ok:false,entries:[],reasons:[why]};
  entries.push(e);
  const permitted=new Set([...(taskPolicy.defaults||[]),...(taskPolicy.permittedFallbacks||[])]);
  for(const id of config.fallbackModels||[]){
   const fe=findModel(catalog,id),fwhy=check(fe,id,excluded);
   if(fwhy)return {ok:false,entries:[],reasons:["Fallback refused: "+fwhy]};
   if(!permitted.has(id))return {ok:false,entries:[],reasons:["Fallback "+id+" is not in the tested set for "+task+"; add it to the selection policy after evaluation"]};
   if(!entries.includes(fe))entries.push(fe);
  }
  return {ok:true,entries,reasons,origin:"configured"};
 }
 for(const id of [...(taskPolicy.defaults||[]),...(taskPolicy.permittedFallbacks||[])]){
  const e=findModel(catalog,id),why=check(e,id,excluded);
  if(why){reasons.push(why);continue}
  if(!entries.includes(e))entries.push(e);
 }
 if(!entries.length)return {ok:false,entries:[],reasons:reasons.length?reasons:["No tested default for task "+task]};
 return {ok:true,entries:entries.slice(0,3),reasons,origin:"selection_policy"};
}
