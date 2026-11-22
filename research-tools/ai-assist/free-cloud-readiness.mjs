/**
 * HPI-AI.6 — strictly read-only free-cloud readiness inspection.
 * No key, no POST, no prompts, no inference, no secrets in returned report.
 * ZDR registry membership and model-list zero price are necessary but not
 * sufficient for safe inference; requests must enforce BOTH provider.zdr=true
 * and provider.data_collection=deny at call time.
 */
import {discoverOpenRouterCatalog,verifyModelEndpoints} from "./catalog.mjs";
import {loadSelectionPolicy} from "./runtime.mjs";

export const PILOT_FREE_MODELS=Object.freeze([
 "inclusionai/ling-3.2-flash:free",
 "google/gemma-4-31b-it:free",
 "google/gemma-4-26b-a4b-it:free",
 "baidu/ernie-5.5-flash-preview:free"
]);

/** Deterministic, inspectable metadata status: not a model-quality ranking. */
export function assessFreeCloudCandidate(entry,{registryChecked=false,excluded=[],
 endpointPricingVerified=false,endpointCount=0}={}){
 const blockers=[];
 if(!entry){blockers.push("model_not_in_live_catalogue");}
 else{
  if(!entry.id.endsWith(":free")||entry.costClass!=="verified_free"||!entry.eligibleFreeText)
   blockers.push("not_verified_free_text_model");
  if(!registryChecked)blockers.push("zdr_endpoint_registry_unavailable");
  else if(entry.zdrListed!==true)blockers.push("not_listed_with_zero_priced_zdr_endpoint");
  if(excluded.some(x=>x.id===entry.id))blockers.push("historically_excluded_by_hpi_policy_requires_reassessment");
  if(!endpointPricingVerified||endpointCount<1)blockers.push("endpoint_zero_pricing_not_verified");
 }
 return {id:entry?.id??null,listed:!!entry,metadataEligible:blockers.length===0,
  blockers,referenceAccuracyValidated:false,paidInferenceAllowed:false,
  cloudInferencePerformed:false,zdrAtInferenceNotVerified:true,
  requiresDataCollectionDenyAtCallTime:true,independentScientificReview:false};
}

/**
 * GET only: current public OpenRouter model catalogue, ZDR endpoint registry,
 * and bounded per-model endpoint pricing for requested research models.
 * Not a substitute for an authorised account-level API key or live accuracy.
 */
export async function inspectFreeCloudModels({fetchImpl=globalThis.fetch,
 now=()=>new Date(),models=PILOT_FREE_MODELS,policy=null}={}){
 if(!Array.isArray(models)||models.length<1||models.length>10||
  new Set(models).size!==models.length||
  models.some(id=>typeof id!=="string"||!/^[a-z0-9._/-]+:free$/i.test(id)))
  throw new Error("Read-only preflight requires 1-10 distinct literal :free model identifiers");
 const current=await discoverOpenRouterCatalog({fetchImpl,now});
 const modelPolicy=policy??await loadSelectionPolicy();
 const registryChecked=current.zdrListChecked===true;
 const byId=new Map(current.models.map(m=>[m.id,m]));
 const candidates=[];
 for(const id of models){
  const m=byId.get(id)||null;
  // No endpoint query if the model is not eligible on metadata.
  const safeToProbe=registryChecked&&m?.zdrListed===true&&
   m.costClass==="verified_free"&&m.eligibleFreeText===true;
  const endpoints=safeToProbe?await verifyModelEndpoints(id,{fetchImpl}):null;
  const v=assessFreeCloudCandidate(m,{registryChecked,excluded:modelPolicy.excluded,
   endpointPricingVerified:endpoints?.ok===true,endpointCount:endpoints?.endpoints?.length||0});
  candidates.push({...v,id,zdrListed:m?.zdrListed??false,
   perModelZeroPricingStatus:endpoints?.status??"not_checked",
   endpointCount:endpoints?.endpoints?.length??0,
   routeMode:"free_only_no_fallback",
   privacyGate:"ZDR registry AND provider.zdr=true AND provider.data_collection=deny at request",
   scientificQuality:"not_established_by_catalogue"});
 }
 return {
  kind:"hpi_ai6_free_cloud_readonly_preflight",at:now().toISOString(),
  catalogSource:"https://openrouter.ai/api/v1/models",
  zdrRegistrySource:"https://openrouter.ai/api/v1/endpoints/zdr",
  endpointPricingSource:"https://openrouter.ai/api/v1/models/{id}/endpoints",
  modelCatalogueCount:current.models.length,zdrRegistryChecked:registryChecked,
  modelsRequested:models.length,
  eligibleForCredentialedExperiment:candidates.filter(c=>c.metadataEligible).map(c=>c.id),
  candidates,
  credentialsChecked:false,requestsSentToModels:0,paidRequestsSent:0,providerCostsUsd:0,
  publicationAuthorised:false,scienceValidated:false,
  caveats:[
   "Metadata eligibility does not confirm the actual inference endpoint honours retention settings.",
   "No prompts or model calls were sent. No accuracy measurements or private source data.",
   "A valid HPI OpenRouter credential and current account limits are needed for actual testing.",
   "Never downgrade ZDR to deny_collection to make an unsupported model pass.",
   "Provider endpoint eligibility can change after this timestamp; recheck before each experiment."
  ]
 };
}
