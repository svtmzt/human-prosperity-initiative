/**
 * OpenRouter model discovery and free-model verification.
 *
 * Sources (no inference quota is consumed):
 *   GET https://openrouter.ai/api/v1/models          catalogue with pricing
 *   GET https://openrouter.ai/api/v1/endpoints/zdr   endpoints on the ZDR list
 *   GET https://openrouter.ai/api/v1/models/{id}/endpoints   per-endpoint pricing
 *
 * A model is "verified_free" only if ALL hold:
 *  1. its id ends in ":free" (OpenRouter's free catalogue variant);
 *  2. every listed price component parses as a decimal and equals zero, with
 *     at least prompt and completion present and no per-provider overrides;
 *  3. it outputs text only and is served on /api/v1/chat/completions;
 *  4. it is not a router (openrouter/*), whose underlying model is chosen at
 *     random and is therefore not reproducible;
 *  5. it is not past its expiration date.
 * A zero price on a non-":free" id is NOT treated as free: such entries can be
 * billed in other ways (for example per generated song) or require a funded
 * account. Missing, malformed or ambiguous pricing fails closed.
 */
export const CATALOG_SCHEMA="hpi_ai_openrouter_catalog/1.0";
export const OPENROUTER_API="https://openrouter.ai/api/v1";
const DECIMAL=/^-?\d+(?:\.\d+)?(?:e-?\d+)?$/i;

export function verifyFreePricing(pricing){
 if(!pricing||typeof pricing!=="object"||Array.isArray(pricing))return {status:"missing",zero:false,detail:"No pricing object"};
 const entries=Object.entries(pricing).filter(([k])=>k!=="discount");
 if(!entries.length)return {status:"missing",zero:false,detail:"Empty pricing object"};
 if(!("prompt" in pricing)||!("completion" in pricing))return {status:"ambiguous",zero:false,detail:"Prompt or completion price missing"};
 if("overrides" in pricing)return {status:"ambiguous",zero:false,detail:"Per-provider price overrides present"};
 for(const [k,v] of entries){
  if(v===null||v===undefined||v==="")return {status:"ambiguous",zero:false,detail:"Price component "+k+" is empty"};
  const s=String(v).trim();
  if(!DECIMAL.test(s))return {status:"ambiguous",zero:false,detail:"Price component "+k+" is not a number: "+s};
  if(Number(s)!==0)return {status:"paid",zero:false,detail:"Price component "+k+" = "+s};
 }
 return {status:"verified_zero",zero:true,detail:"All "+entries.length+" price components are zero"};
}

export function classifyModel(raw,{zdrModelIds=new Set(),now=new Date()}={}){
 const id=String(raw?.id||"");
 const pricing=verifyFreePricing(raw?.pricing);
 const arch=raw?.architecture||{};
 const params=Array.isArray(raw?.supported_parameters)?raw.supported_parameters:[];
 const outputs=Array.isArray(arch.output_modalities)?arch.output_modalities:[];
 const endpoints=Array.isArray(raw?.endpoints)?raw.endpoints:null;
 const freeVariant=id.endsWith(":free");
 const router=id.startsWith("openrouter/");
 const expiration=raw?.expiration_date?new Date(raw.expiration_date):null;
 const expired=Boolean(expiration&&Number.isFinite(expiration.getTime())&&expiration<=now);
 const reasons=[];
 if(!freeVariant)reasons.push(pricing.zero?"zero-priced but not a ':free' variant (may be billed otherwise or need a funded account)":"not a ':free' variant");
 if(!pricing.zero)reasons.push("pricing "+pricing.status+": "+pricing.detail);
 if(outputs.length!==1||outputs[0]!=="text")reasons.push("output modalities are not text-only");
 if(endpoints&&!endpoints.includes("/api/v1/chat/completions"))reasons.push("not served on chat completions");
 if(router)reasons.push("router: underlying model is selected at random (not reproducible)");
 if(expired)reasons.push("model expired "+raw.expiration_date);
 let costClass="paid";
 if(pricing.status==="missing"||pricing.status==="ambiguous")costClass="ambiguous";
 else if(pricing.zero&&router)costClass="router_free";
 else if(pricing.zero&&!freeVariant)costClass="zero_priced_not_free_variant";
 else if(pricing.zero&&freeVariant)costClass="verified_free";
 const r=raw?.reasoning&&typeof raw.reasoning==="object"?raw.reasoning:null;
 return {id,name:String(raw?.name||id),author:id.split("/")[0]||null,canonicalSlug:raw?.canonical_slug||null,
  freeVariant,router,costClass,pricingStatus:pricing.status,pricingDetail:pricing.detail,
  eligibleFreeText:reasons.length===0,ineligibleReasons:reasons,
  contextLength:Number.isInteger(raw?.context_length)?raw.context_length:null,
  maxCompletionTokens:Number.isInteger(raw?.top_provider?.max_completion_tokens)?raw.top_provider.max_completion_tokens:null,
  inputModalities:Array.isArray(arch.input_modalities)?[...arch.input_modalities]:[],outputModalities:[...outputs],
  supportsResponseFormat:params.includes("response_format"),supportsStructuredOutputs:params.includes("structured_outputs"),
  supportsTools:params.includes("tools"),supportsSeed:params.includes("seed"),supportsTemperature:params.includes("temperature"),
  supportedParameters:[...params].sort(),
  reasoning:r?{supported:params.includes("reasoning"),mandatory:r.mandatory===true,defaultEnabled:r.default_enabled===true,
   supportedEfforts:Array.isArray(r.supported_efforts)?[...r.supported_efforts]:null}:{supported:params.includes("reasoning"),mandatory:false,defaultEnabled:false,supportedEfforts:null},
  moderated:raw?.top_provider?.is_moderated===true,
  expirationDate:raw?.expiration_date||null,
  zdrListed:zdrModelIds.has(id),
  description:typeof raw?.description==="string"?raw.description.slice(0,240):null};
}

/** Parse the /models and /endpoints/zdr payloads into a versioned catalogue. */
export function parseCatalog(modelsPayload,zdrPayload,{fetchedAt=new Date().toISOString(),now=new Date(fetchedAt)}={}){
 if(!modelsPayload||!Array.isArray(modelsPayload.data))throw new CatalogError("malformed_catalog","OpenRouter /models payload has no data array");
 const zdrModelIds=new Set();
 let zdrAvailable=false;
 if(zdrPayload&&Array.isArray(zdrPayload.data)){zdrAvailable=true;
  for(const e of zdrPayload.data){const v=verifyFreePricing(e?.pricing);if(e?.model_id&&v.zero)zdrModelIds.add(String(e.model_id))}}
 const models=modelsPayload.data.filter(m=>m&&typeof m.id==="string").map(m=>classifyModel(m,{zdrModelIds,now}));
 const count=c=>models.filter(m=>m.costClass===c).length;
 return {schema:CATALOG_SCHEMA,source:"openrouter_api_v1",fetchedAt,zdrListChecked:zdrAvailable,
  counts:{total:models.length,verifiedFree:count("verified_free"),eligibleFreeText:models.filter(m=>m.eligibleFreeText).length,
   zeroPricedNotFreeVariant:count("zero_priced_not_free_variant"),routerFree:count("router_free"),ambiguous:count("ambiguous"),paid:count("paid")},
  models};
}

export class CatalogError extends Error{constructor(code,message){super(message);this.code=code}}

async function getJson(fetchImpl,url,timeoutMs){
 let response;
 try{response=await fetchImpl(url,{method:"GET",redirect:"error",headers:{accept:"application/json"},signal:AbortSignal.timeout(timeoutMs)})}
 catch(error){throw new CatalogError(error?.name==="TimeoutError"?"timeout":"unavailable","OpenRouter metadata request failed: "+(error?.message||"network error"))}
 if(!response.ok)throw new CatalogError("http_"+response.status,"OpenRouter metadata returned HTTP "+response.status);
 try{return await response.json()}catch{throw new CatalogError("malformed_catalog","OpenRouter metadata is not JSON")}
}

/** Fetch the live catalogue. Never sends an API key; metadata is public. */
export async function discoverOpenRouterCatalog({fetchImpl=globalThis.fetch,now=()=>new Date(),timeoutMs=20000}={}){
 const modelsPayload=await getJson(fetchImpl,OPENROUTER_API+"/models",timeoutMs);
 let zdrPayload=null;
 try{zdrPayload=await getJson(fetchImpl,OPENROUTER_API+"/endpoints/zdr",timeoutMs)}catch{zdrPayload=null}
 const t=now();
 return parseCatalog(modelsPayload,zdrPayload,{fetchedAt:t.toISOString(),now:t});
}

/**
 * Verify every provider endpoint of one model is zero-priced. Used for the
 * small set of selected models before a run (bounded: one call per model).
 */
export async function verifyModelEndpoints(modelId,{fetchImpl=globalThis.fetch,timeoutMs=20000}={}){
 if(!/^[A-Za-z0-9._\/-]+:free$/.test(modelId))return {ok:false,status:"not_free_variant",endpoints:[]};
 const [author,...rest]=modelId.split("/");
 const url=OPENROUTER_API+"/models/"+encodeURIComponent(author)+"/"+rest.join("/").split("/").map(encodeURIComponent).join("/")+"/endpoints";
 let payload;
 try{payload=await getJson(fetchImpl,url,timeoutMs)}catch(e){return {ok:false,status:e.code||"unavailable",endpoints:[],reason:e.message}}
 const list=Array.isArray(payload?.data?.endpoints)?payload.data.endpoints:null;
 if(!list)return {ok:false,status:"malformed_endpoints",endpoints:[]};
 if(!list.length)return {ok:false,status:"no_endpoints",endpoints:[]};
 const endpoints=list.map(e=>({providerName:String(e?.provider_name||"unknown"),tag:String(e?.tag||""),pricing:verifyFreePricing(e?.pricing),
  status:Number.isInteger(e?.status)?e.status:null,uptime30m:typeof e?.uptime_last_30m==="number"?e.uptime_last_30m:null,
  quantization:e?.quantization??null,maxCompletionTokens:Number.isInteger(e?.max_completion_tokens)?e.max_completion_tokens:null}));
 const allZero=endpoints.every(e=>e.pricing.zero);
 return {ok:allZero,status:allZero?"all_endpoints_zero_priced":"paid_or_ambiguous_endpoint_present",endpoints};
}

/** Is the catalogue recent enough to authorise inference? Display may use older data. */
export function catalogFreshness(catalog,{now=new Date(),maxAgeHours=24}={}){
 const t=Date.parse(catalog?.fetchedAt);
 if(!Number.isFinite(t))return {fresh:false,ageHours:null,reason:"Catalogue has no valid fetchedAt timestamp"};
 const ageHours=(now.getTime()-t)/3600000;
 if(ageHours<-0.1)return {fresh:false,ageHours,reason:"Catalogue timestamp is in the future"};
 if(ageHours>maxAgeHours)return {fresh:false,ageHours,reason:"Pricing verification is "+ageHours.toFixed(1)+"h old (limit "+maxAgeHours+"h); refresh the catalogue before inference"};
 return {fresh:true,ageHours,reason:null};
}

/**
 * Load the catalogue with a deliberate, bounded refresh: use the local cache
 * while it is fresh; refresh only when stale or explicitly requested; if the
 * network fails, fall back to the cache but mark it unusable for inference
 * when stale.
 */
export async function loadCatalog({readCache,writeCache,fetchImpl,now=()=>new Date(),maxAgeHours=24,refresh=false}={}){
 let cached=null;
 try{cached=readCache?await readCache():null}catch{cached=null}
 if(cached&&cached.schema!==CATALOG_SCHEMA)cached=null;
 const fresh=cached?catalogFreshness(cached,{now:now(),maxAgeHours}):{fresh:false};
 if(cached&&fresh.fresh&&!refresh)return {catalog:cached,origin:"cache",freshness:fresh};
 try{
  const catalog=await discoverOpenRouterCatalog({fetchImpl,now});
  if(writeCache)await writeCache(catalog);
  return {catalog,origin:"live",freshness:catalogFreshness(catalog,{now:now(),maxAgeHours})};
 }catch(error){
  if(cached)return {catalog:cached,origin:"cache_after_refresh_failure",refreshError:error.message,freshness:catalogFreshness(cached,{now:now(),maxAgeHours})};
  return {catalog:null,origin:"unavailable",refreshError:error.message,freshness:{fresh:false,reason:"No catalogue available: "+error.message}};
 }
}

export function findModel(catalog,id){return catalog?.models?.find(m=>m.id===id)||null}

/** Compact, publishable snapshot of verified free text models. */
export function catalogSnapshot(catalog){
 return {schema:CATALOG_SCHEMA+"+snapshot",source:catalog.source,fetchedAt:catalog.fetchedAt,zdrListChecked:catalog.zdrListChecked,counts:catalog.counts,
  freeTextModels:catalog.models.filter(m=>m.eligibleFreeText).map(m=>({id:m.id,name:m.name,author:m.author,contextLength:m.contextLength,
   maxCompletionTokens:m.maxCompletionTokens,inputModalities:m.inputModalities,supportsResponseFormat:m.supportsResponseFormat,
   supportsStructuredOutputs:m.supportsStructuredOutputs,reasoning:m.reasoning,zdrListed:m.zdrListed,moderated:m.moderated,expirationDate:m.expirationDate})).sort((a,b)=>a.id.localeCompare(b.id)),
  excludedZeroPriced:catalog.models.filter(m=>!m.eligibleFreeText&&m.pricingStatus==="verified_zero").map(m=>({id:m.id,costClass:m.costClass,reasons:m.ineligibleReasons})).sort((a,b)=>a.id.localeCompare(b.id))};
}
