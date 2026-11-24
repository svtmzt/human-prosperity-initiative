/** Read-only comparative cost planning. No credential, no POST, no inference.
 * A budget recommendation is never execution authority. */
import {API,PAID_SCIENCE_MODELS,verifyPaidZdrEndpoint} from "./paid-pilot-safety.mjs";
const get=async(fetchImpl,path)=>{
 const response=await fetchImpl(API+path,{method:"GET",redirect:"error",headers:{accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error("OpenRouter metadata refused HTTP "+response.status);
 const doc=await response.json();
 if(!doc?.data)throw Error("Missing OpenRouter metadata");
 return doc;
};
export function projectComparativeCost(routes,{cases=25,inputTokensEach=3000,outputTokensEach=1200}={}){
 if(!Number.isInteger(cases)||cases<1||cases>100||!Number.isInteger(inputTokensEach)||inputTokensEach<1||inputTokensEach>20000||!Number.isInteger(outputTokensEach)||outputTokensEach<1||outputTokensEach>1600)throw Error("Invalid comparison scope");
 if(!Array.isArray(routes)||routes.length!==Object.keys(PAID_SCIENCE_MODELS).length||new Set(routes.map(x=>x.modelId)).size!==routes.length)throw Error("Five distinct routes required");
 const entries=routes.map(r=>{
  if(PAID_SCIENCE_MODELS[r.modelId]!==r.providerName||r.zdrVerifiedAtMetadata!==true||
   !r.matchedEndpointTags?.length||!Number.isFinite(r.inputUsdPerMillion)||r.inputUsdPerMillion<=0||
   !Number.isFinite(r.outputUsdPerMillion)||r.outputUsdPerMillion<=0)throw Error("Unverified route");
  const estimatedUsd=cases*(inputTokensEach*r.inputUsdPerMillion+outputTokensEach*r.outputUsdPerMillion)/1e6;
  return {...r,requests:cases,estimatedUsd};
 });
 return {casesPerModel:cases,totalRequests:cases*entries.length,inputTokensEach,outputTokensEach,
  estimatedUsd:entries.reduce((a,r)=>a+r.estimatedUsd,0),routes:entries,
  priceEstimateOnly:true,paidExecutionAuthorised:false,scientificAccuracyMeasured:false,
  exclusions:["reasoning overhead and provider surcharges","future price changes","taxes and unsuccessful requests"],
  requirements:["explicit new cumulative budget and durable ledger","fresh route checks at execution","exact provider, ZDR, data collection deny and no fallback","source rights and prompt-only public metadata","no model execution until a separately implemented and tested paid runner is approved"]};
}
export async function inspectCloudComparison({fetchImpl=globalThis.fetch,now=()=>new Date().toISOString()}={}){
 const [catalog,registry]=await Promise.all([get(fetchImpl,"/models"),get(fetchImpl,"/endpoints/zdr")]);
 const routes=[];
 for(const [modelId,providerName] of Object.entries(PAID_SCIENCE_MODELS)){
  const endpoint=await get(fetchImpl,"/models/"+modelId.split("/").map(encodeURIComponent).join("/")+"/endpoints");
  routes.push(verifyPaidZdrEndpoint({modelId,providerName,model:catalog.data.find(m=>m.id===modelId),registry,endpoints:endpoint}));
 }
 return {classification:"READ_ONLY_CLOUD_COMPARISON_PLAN",checkedAt:now(),catalogueCount:catalog.data.length,
  publicMetadataGets:7,initialTenCases:projectComparativeCost(routes,{cases:10}),
  expandedTwentyFiveCases:projectComparativeCost(routes,{cases:25}),paidModelCalls:0,paidExecutionAuthorised:false};
}
