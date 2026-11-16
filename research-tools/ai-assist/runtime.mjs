/**
 * Runtime wiring shared by the CLI and the evaluation harness:
 * configuration → (OpenRouter) catalogue + selection policy → provider.
 * File paths for caches and ledgers are under qa-artifacts/ (git-ignored).
 */
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname} from "node:path";
import {readApiKey} from "./config.mjs";
import {createDisabledProvider,createOpenAiCompatibleProvider,createLocalProvider,createOpenRouterProvider,CircuitBreaker} from "./providers.mjs";
import {loadCatalog,verifyModelEndpoints} from "./catalog.mjs";
import {selectModels,validateSelectionPolicy} from "./selection.mjs";
import {FileQuotaStore,QuotaLedger} from "./quota.mjs";

export const PATHS=Object.freeze({
 catalogCache:"qa-artifacts/ai-cache/openrouter-catalog.json",
 quotaLedger:"qa-artifacts/ai-cache/quota-ledger.json",
 selectionPolicy:"research/ai/model-selection-policy.json",
 snapshot:"research/ai/openrouter-free-models-snapshot.json"
});

export async function readJsonFile(path){return JSON.parse(await readFile(path,"utf8"))}
async function writeJsonFile(path,data){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(data,null,2)+"\n")}

export async function loadSelectionPolicy(path=PATHS.selectionPolicy){
 const policy=await readJsonFile(path);
 const errors=validateSelectionPolicy(policy);
 if(errors.length)throw new Error("Invalid model selection policy: "+errors.join("; "));
 return policy;
}

export async function loadOpenRouterCatalog({config,fetchImpl=globalThis.fetch,refresh=false,now=()=>new Date()}){
 return loadCatalog({readCache:()=>readJsonFile(PATHS.catalogCache),writeCache:c=>writeJsonFile(PATHS.catalogCache,c),
  fetchImpl,now,maxAgeHours:config.catalogMaxAgeHours||24,refresh});
}

/**
 * Build a provider for a task. Returns {provider, notes, selection, catalogInfo}.
 * For OpenRouter: requires a fresh catalogue, a policy-approved model list and
 * per-endpoint zero pricing for every selected model.
 */
export async function buildProvider(config,{env=process.env,task,fetchImpl=globalThis.fetch,quotaStore=null,refreshCatalog=false,
 models:explicitModels=null,allowFallback=true,sleep,now=()=>new Date(),providerOptions={}}={}){
 const notes=[];
 if(!config.available)return {provider:createDisabledProvider(config.reasonDisabled),notes};
 const apiKey=readApiKey(config,env);
 if(config.kind==="openai_compatible")return {provider:createOpenAiCompatibleProvider(config,{fetchImpl,apiKey}),notes};
 if(config.kind==="local"){
  const {provider,discovery,model}=await createLocalProvider(config,{fetchImpl,apiKey});
  if(discovery)notes.push("Local discovery: "+discovery.status+(discovery.models?.length?" ("+discovery.models.length+" models)":"")+(model?"; using "+model:""));
  return {provider,notes,discovery};
 }
 // OpenRouter, free only
 const policy=await loadSelectionPolicy();
 const cat=await loadOpenRouterCatalog({config,fetchImpl,refresh:refreshCatalog,now});
 const catalogInfo={origin:cat.origin,fetchedAt:cat.catalog?.fetchedAt??null,fresh:cat.freshness.fresh,reason:cat.freshness.reason??cat.refreshError??null,counts:cat.catalog?.counts??null};
 if(!cat.freshness.fresh)return {provider:createDisabledProvider("Free-model pricing cannot be verified: "+(cat.freshness.reason||cat.refreshError)),notes,catalogInfo};
 const selection=explicitModels
  ?selectModels(task,{catalog:cat.catalog,policy,config:{...config,model:explicitModels[0],fallbackModels:explicitModels.slice(1)},now:now()})
  :selectModels(task,{catalog:cat.catalog,policy,config,now:now()});
 if(!selection.ok)return {provider:createDisabledProvider("No permitted free model: "+selection.reasons.join("; ")),notes,selection,catalogInfo};
 for(const r of selection.reasons)notes.push("Selection note: "+r);
 const endpointChecks=[];
 for(const e of selection.entries){
  const v=await verifyModelEndpoints(e.id,{fetchImpl});
  endpointChecks.push({model:e.id,status:v.status,providers:v.endpoints.map(x=>x.providerName)});
  if(!v.ok)return {provider:createDisabledProvider("Endpoint pricing check failed for "+e.id+": "+v.status+". Paid or unverified endpoints are never used."),notes,selection,catalogInfo,endpointChecks};
 }
 const store=quotaStore||new FileQuotaStore(PATHS.quotaLedger);
 const provider=createOpenRouterProvider(config,{fetchImpl,apiKey,models:selection.entries,breaker:new CircuitBreaker(),allowFallback,sleep,...providerOptions,
  quota:new QuotaLedger({store,dailyCeiling:config.dailyRequestCeiling,scope:"openrouter-attempts",now})});
 return {provider,notes,selection,catalogInfo,endpointChecks};
}
