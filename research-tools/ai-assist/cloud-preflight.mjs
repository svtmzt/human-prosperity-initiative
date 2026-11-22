/**
 * Read-only OpenRouter discovery for HPI-AI.6-T06.
 * Model-list ZDR metadata does NOT certify any endpoint-level data policy.
 * No auth, no inference, no paid request, no secret extraction.
 */
export const OPENROUTER_MODELS_URL="https://openrouter.ai/api/v1/models";
export const OPENROUTER_ZDR_URL="https://openrouter.ai/api/v1/models?zdr=true";
export const INITIAL_FREE_CANDIDATES=Object.freeze([
 "baidu/ernie-5.5-flash-preview:free",
 "inclusionai/ling-3.2-flash:free"
]);
const priceZero=value=>value!=null&&/^(?:0|0\.0+)$/.test(String(value));
export function declaredZeroTokenPrice(model){
 const p=model?.pricing;
 return typeof model?.id==="string" && model.id.endsWith(":free") &&
  priceZero(p?.prompt) && priceZero(p?.completion) &&
  (p?.request==null||priceZero(p.request));
}
async function readCatalogue(url,fetchImpl){
 const response=await fetchImpl(url,{
  method:"GET",redirect:"error",
  headers:{"Accept":"application/json","User-Agent":"HPI-cloud-metadata-preflight/1.0"}
 });
 if(!response?.ok)throw new Error("OpenRouter public metadata unavailable or failed closed");
 const payload=await response.json();
 if(!Array.isArray(payload?.data))throw new Error("Unexpected OpenRouter public metadata format");
 if(payload.data.some(x=>!x||typeof x.id!=="string"))throw new Error("Invalid OpenRouter model identifier");
 return payload.data;
}
export async function readOnlyCloudPreflight({fetchImpl=globalThis.fetch,now=()=>new Date()}={}){
 const [catalogue,zdrCatalogue]=await Promise.all([
  readCatalogue(OPENROUTER_MODELS_URL,fetchImpl),
  readCatalogue(OPENROUTER_ZDR_URL,fetchImpl)
 ]);
 const all=new Map(catalogue.map(model=>[model.id,model]));
 const zdrIds=new Set(zdrCatalogue.map(model=>model.id));
 const candidates=[...new Set([...INITIAL_FREE_CANDIDATES,
  ...catalogue.filter(m=>m.id.endsWith(":free")).map(m=>m.id)])].sort().map(id=>{
  const model=all.get(id);
  const zeroPrice=declaredZeroTokenPrice(model);
  const inZdrCatalogue=zdrIds.has(id);
  return {id,catalogued:Boolean(model),zeroPriceInPublicModelCatalogue:zeroPrice,
   appearsInZdrModelCatalogue:inZdrCatalogue,
   catalogOnlyCandidate:Boolean(zeroPrice&&inZdrCatalogue),
   callableWithoutFreshEndpointPolicyCheck:false,
   independentlyVerifiedScientificAccuracy:false};
 });
 return {kind:"hpi_ai6_openrouter_metadata_only_preflight",
  checkedAt:now().toISOString(),sources:[OPENROUTER_MODELS_URL,OPENROUTER_ZDR_URL],
  method:"public GET only; no Authorization header; no model inference",
  checkedModelCount:catalogue.length,
  freeCataloguedCount:candidates.filter(x=>x.zeroPriceInPublicModelCatalogue).length,
  freeListedZdrCount:candidates.filter(x=>x.catalogOnlyCandidate).length,
  candidates,
  noTrainingPolicyVerified:false,perEndpointZdrVerified:false,
  inferencePerformed:false,paidRequestPerformed:false,
  scientificBenchmarkCompleted:false,autoPublishAuthorised:false,
  nextGate:"HPI-scoped OpenRouter key, current endpoint-level ZDR + data_collection=deny + price/quotas, public licensed input, private real panel followed by independent human review"};
}
