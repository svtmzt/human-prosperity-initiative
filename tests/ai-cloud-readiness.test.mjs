import test from "node:test";
import assert from "node:assert/strict";
import {inspectFreeCloudModels,assessFreeCloudCandidate,PILOT_FREE_MODELS} from "../research-tools/ai-assist/free-cloud-readiness.mjs";
import {readAiConfig} from "../research-tools/ai-assist/config.mjs";
import {buildProvider} from "../research-tools/ai-assist/runtime.mjs";
import {runPanelWithProvider} from "../scripts/ai-scientific-panel.mjs";

const ling="inclusionai/ling-3.2-flash:free";
const gemma="google/gemma-4-31b-it:free";
const ernie="baidu/ernie-5.5-flash-preview:free";
const model=id=>({id,canonical_slug:id.replace(/:free$/,""),
  pricing:{prompt:"0",completion:"0"},architecture:{output_modalities:["text"],input_modalities:["text"]},
  supported_parameters:["structured_outputs","response_format"],endpoints:["/api/v1/chat/completions"]});
const zdr=[ling,gemma];
const fixtureFetch=({zdrAvailable=true,endpointPaid=false}={})=>{
 const called=[];
 const fetchImpl=async(url,opts={})=>{
  called.push({url,method:opts.method||"GET",hasAuth:!!opts.headers?.authorization});
  if(!url.startsWith("https://openrouter.ai/api/v1/"))throw Error("Unexpected destination: "+url);
  if(opts.method==="POST")throw Error("A metadata audit must never call an inference endpoint");
  const out=(data,status=200)=>({ok:status===200,status,json:async()=>data});
  if(url.endsWith("/models"))return out({data:[model(ling),model(gemma),model(ernie)]});
  if(url.endsWith("/endpoints/zdr"))return zdrAvailable?
    out({data:zdr.map(id=>({model_id:id,pricing:{prompt:"0",completion:"0"}}))}):
    {ok:false,status:503};
  if(url.includes("/models/")&&url.endsWith("/endpoints"))
   return out({data:{endpoints:[{provider_name:"Fixture provider",status:0,
    pricing:{prompt:"0",completion:endpointPaid?"0.0000001":"0"}}]}});
  throw Error("Unknown metadata URL: "+url);
 };
 return {fetchImpl,called};
};

test("credential-free cloud preflight accurately marks ZDR and exact zero pricing",async()=>{
 const {fetchImpl,called}=fixtureFetch();
 const report=await inspectFreeCloudModels({fetchImpl,models:[ling,gemma,ernie],
  now:()=>new Date("2026-11-22T12:40:00Z")});
 assert.equal(report.kind,"hpi_ai6_free_cloud_readonly_preflight");
 assert.equal(report.zdrRegistryChecked,true);
 assert.deepEqual(report.eligibleForCredentialedExperiment,[ling,gemma]);
 assert.equal(report.candidates.find(x=>x.id===ernie).metadataEligible,false);
 assert.ok(report.candidates.find(x=>x.id===ernie).blockers.includes("not_listed_with_zero_priced_zdr_endpoint"));
 assert.equal(report.requestsSentToModels,0);
 assert.equal(report.paidRequestsSent,0);
 assert.equal(report.providerCostsUsd,0);
 assert.equal(report.publicationAuthorised,false);
 assert.ok(called.length<=5);
 assert.ok(called.every(x=>x.method==="GET"&&x.hasAuth===false));
 assert.ok(!called.some(x=>x.url.includes("chat/completions")));
});

test("preflight fails closed on missing ZDR registry, nonzero endpoint price and legacy exclusions",async()=>{
 const down=fixtureFetch({zdrAvailable:false});
 const report=await inspectFreeCloudModels({fetchImpl:down.fetchImpl,models:[ling],
  now:()=>new Date("2026-11-22T12:40:00Z")});
 assert.equal(report.zdrRegistryChecked,false);
 assert.equal(report.candidates[0].metadataEligible,false);
 assert.ok(report.candidates[0].blockers.includes("zdr_endpoint_registry_unavailable"));
 const paid=fixtureFetch({endpointPaid:true});
 const report2=await inspectFreeCloudModels({fetchImpl:paid.fetchImpl,models:[ling],
  now:()=>new Date("2026-11-22T12:40:00Z")});
 assert.equal(report2.candidates[0].metadataEligible,false);
 assert.ok(report2.candidates[0].blockers.includes("endpoint_zero_pricing_not_verified"));
 const excluded=assessFreeCloudCandidate({id:ling,costClass:"verified_free",
  eligibleFreeText:true,zdrListed:true},{registryChecked:true,
  excluded:[{id:ling,reason:"legacy excluded"}],endpointPricingVerified:true,endpointCount:1});
 assert.ok(excluded.blockers.includes("historically_excluded_by_hpi_policy_requires_reassessment"));
 assert.equal(PILOT_FREE_MODELS.length,4);
 await assert.rejects(()=>inspectFreeCloudModels({models:["openai/gpt-6.2-astra"]}),/literal :free/);
});

test("actual ZDR provider builder rejects non-ZDR model before any POST",async()=>{
 const {fetchImpl,called}=fixtureFetch();
 const env={HPI_AI_PROVIDER:"openrouter",OPENROUTER_API_KEY:"fixture-token-never-sent",
  HPI_AI_MODEL:ernie,HPI_AI_OPENROUTER_DATA_POLICY:"zdr"};
 const conf=readAiConfig(env);
 const result=await buildProvider(conf,{env,task:"claim-extraction",fetchImpl,refreshCatalog:true,
  now:()=>new Date("2026-11-22T12:41:00Z")});
 assert.equal(result.provider.available,false);
 const denial=await result.provider.complete([]);
 assert.match(denial.reason,/no verified zero-priced ZDR endpoint/);
 assert.ok(called.every(c=>c.method==="GET"&&!c.hasAuth));
 assert.ok(called.every(c=>!c.url.includes("chat/completions")));
});
test("actual provider builder refuses missing registry and nonzero endpoint fees",async()=>{
 for(const opts of [{zdrAvailable:false},{endpointPaid:true}]){
  const {fetchImpl,called}=fixtureFetch(opts);
  const env={HPI_AI_PROVIDER:"openrouter",OPENROUTER_API_KEY:"fixture-not-real",
   HPI_AI_MODEL:ling,HPI_AI_OPENROUTER_DATA_POLICY:"zdr"};
  const result=await buildProvider(readAiConfig(env),{env,task:"claim-extraction",
   fetchImpl,refreshCatalog:true,now:()=>new Date("2026-11-22T12:41:00Z")});
  assert.equal(result.provider.available,false);
  assert.ok(called.every(c=>c.method!=="POST"));
 }
});
test("ZDR eligible model builds a no-fallback provider without sending prompts",async()=>{
 const {fetchImpl,called}=fixtureFetch();
 const env={HPI_AI_PROVIDER:"openrouter",OPENROUTER_API_KEY:"fixture-not-real",
  HPI_AI_MODEL:ling,HPI_AI_OPENROUTER_DATA_POLICY:"zdr"};
 const cfg=readAiConfig(env);
 const {provider,selection}=await buildProvider(cfg,{env,task:"claim-extraction",
  fetchImpl,refreshCatalog:true,now:()=>new Date("2026-11-22T12:41:00Z"),allowFallback:false});
 assert.equal(provider.available,true);
 assert.equal(provider.model,ling);
 assert.equal(provider.boundary,"free_cloud");
 assert.equal(selection.entries[0].zdrListed,true);
 assert.ok(called.every(x=>x.method==="GET"));
});
test("scientific CLI refuses explicit downgrade from ZDR to weaker privacy policy",async()=>{
 const env={HPI_AI_PROVIDER:"openrouter",HPI_AI_OPENROUTER_DATA_POLICY:"deny_collection"};
 await assert.rejects(()=>runPanelWithProvider({task:"claim-extraction",
  itemIds:["claim:E08"],modelIds:["openrouter::"+ling,"openrouter::"+gemma],
  config:readAiConfig(env),env}),/data-policy downgrade is forbidden/);
});

test("ZDR eligibility of a PAID base model never transfers to its free variant",async()=>{
 const gemmaFree=model(gemma);
 const fetchImpl=async(url,opts={})=>{
  assert.equal(opts.method??"GET","GET");
  const ok=data=>({ok:true,status:200,json:async()=>({data})});
  if(url.endsWith("/models"))return ok([gemmaFree]);
  if(url.endsWith("/endpoints/zdr"))return ok([{
   model_id:"google/gemma-4-31b-it",pricing:{prompt:"0.00000034",completion:"0.0000001"}
  }]);
  throw Error("Must not fetch candidate endpoints for a free variant without an exact free ZDR match");
 };
 const audit=await inspectFreeCloudModels({fetchImpl,models:[gemma],
  now:()=>new Date("2026-11-22T12:45:00Z")});
 assert.equal(audit.candidates[0].metadataEligible,false);
 assert.equal(audit.candidates[0].zdrListed,false);
 assert.equal(audit.requestsSentToModels,0);
});
