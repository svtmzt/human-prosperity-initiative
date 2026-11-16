/**
 * Usage ceilings for AI research assistance.
 *
 *  - RequestBudget (providers.mjs): per-run request and input ceilings.
 *  - QuotaLedger: application-wide daily request ceiling (UTC day), backed by
 *    a store. The CLI uses a local file store. A shared public gateway MUST use
 *    a store that declares durable:true and offers an atomic increment;
 *    in-memory stores declare durable:false and are refused by the gateway,
 *    because serverless memory does not survive across instances.
 *  - parseKeyStatus: OpenRouter's own account view (GET /api/v1/key), used to
 *    stop a run before the provider-side free quota is exhausted and to prove
 *    that spend did not change.
 */
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname} from "node:path";

export const utcDay=(d=new Date())=>d.toISOString().slice(0,10);

/** Volatile store for tests and single-process CLI runs. Not durable. */
export class MemoryQuotaStore{
 constructor(){this.counters=new Map();this.durable=false}
 async incrementIfBelow(key,limit){const n=this.counters.get(key)||0;if(n>=limit)return {ok:false,count:n};this.counters.set(key,n+1);return {ok:true,count:n+1}}
 async get(key){return this.counters.get(key)||0}
}
/** Local JSON file store (single researcher machine; git-ignored path). */
export class FileQuotaStore{
 constructor(path){this.path=path;this.durable=false;this.scope="single_machine"}
 async #read(){try{return JSON.parse(await readFile(this.path,"utf8"))}catch{return {schema:"hpi_ai_quota_ledger/1.0",counters:{}}}}
 async incrementIfBelow(key,limit){
  const data=await this.#read();const n=data.counters[key]||0;
  if(n>=limit)return {ok:false,count:n};
  data.counters[key]=n+1;
  // bound file growth: drop counters older than 14 days
  const cutoff=utcDay(new Date(Date.now()-14*86400000));
  for(const k of Object.keys(data.counters))if(k.slice(-10)<cutoff)delete data.counters[k];
  await mkdir(dirname(this.path),{recursive:true});await writeFile(this.path,JSON.stringify(data,null,2)+"\n");
  return {ok:true,count:n+1};
 }
 async get(key){return (await this.#read()).counters[key]||0}
}

export class QuotaLedger{
 constructor({store,dailyCeiling,scope="application",now=()=>new Date()}){
  if(!store||typeof store.incrementIfBelow!=="function")throw new Error("QuotaLedger requires a store with incrementIfBelow");
  this.store=store;this.dailyCeiling=dailyCeiling;this.scope=scope;this.now=now;
 }
 key(){return this.scope+":"+utcDay(this.now())}
 /** Reserve one request against today's ceiling. Returns {ok,count,limit}. */
 async reserve(){const r=await this.store.incrementIfBelow(this.key(),this.dailyCeiling);return {...r,limit:this.dailyCeiling,day:utcDay(this.now())}}
 async used(){return this.store.get(this.key())}
}

/** Parse GET /api/v1/key into a secret-free status. Never returns the label or ids. */
export function parseKeyStatus(payload){
 const d=payload?.data;
 if(!d||typeof d!=="object")return {ok:false,reason:"Malformed key status"};
 const num=v=>typeof v==="number"&&Number.isFinite(v)?v:null;
 const free=d.free_model_daily_requests&&typeof d.free_model_daily_requests==="object"?{
  used:num(d.free_model_daily_requests.used),limit:num(d.free_model_daily_requests.limit),remaining:num(d.free_model_daily_requests.remaining)}:null;
 const limitRemaining=num(d.limit_remaining);
 return {ok:true,
  freeModelDailyRequests:free,
  usageUsdTotal:num(d.usage),usageUsdDaily:num(d.usage_daily),
  keyCreditLimitUsd:num(d.limit),keyCreditLimitRemainingUsd:limitRemaining,
  // is_free_tier=false means credits were purchased at some time; it does not mean spend is authorised.
  accountHasPurchasedCredits:d.is_free_tier===false,
  paidSpendPossibleWithThisKey:limitRemaining===null?true:limitRemaining>0,
  allowedDataRegions:Array.isArray(d.allowed_data_regions)?d.allowed_data_regions.map(String):null};
}

export async function fetchKeyStatus({fetchImpl=globalThis.fetch,apiKey,timeoutMs=15000}){
 if(!apiKey)return {ok:false,reason:"No API key configured"};
 let response;
 try{response=await fetchImpl("https://openrouter.ai/api/v1/key",{method:"GET",redirect:"error",
  headers:{authorization:"Bearer "+apiKey,accept:"application/json"},signal:AbortSignal.timeout(timeoutMs)})}
 catch(error){return {ok:false,reason:"Key status request failed: "+(error?.message||"network error")}}
 if(response.status===401||response.status===403)return {ok:false,reason:"OpenRouter rejected the API key (HTTP "+response.status+")",auth:false};
 if(!response.ok)return {ok:false,reason:"Key status returned HTTP "+response.status};
 try{return parseKeyStatus(await response.json())}catch{return {ok:false,reason:"Key status is not JSON"}}
}
