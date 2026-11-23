import test from "node:test";
import assert from "node:assert/strict";
import {
 PAID_SCIENCE_MODELS,MAX_PILOT_USD,verifyPaidZdrEndpoint,
 worstCaseReserveUsd,strictPaidRequest,verifyAccountBudget
} from "../research-tools/ai-assist/paid-pilot-safety.mjs";
const modelId="deepseek/deepseek-v4.1-flash-1017";
const p={prompt:"0.0000001",completion:"0.0000006"};
const model={id:modelId,architecture:{output_modalities:["text"]}};
const registry={data:[{model_id:modelId,provider_name:"Inceptron",tag:"inceptron/fp4",
 status:0,pricing:p}]};
const endpoints={data:{endpoints:[{provider_name:"Inceptron",tag:"inceptron/fp4",
 status:0,pricing:p}]}};
const route=()=>verifyPaidZdrEndpoint({modelId,model,registry,endpoints,providerName:"Inceptron"});
test("verified paid route demands exact model, provider, registry tag and live endpoint",()=>{
 const r=route();
 assert.equal(r.zdrVerifiedAtMetadata,true);
 assert.ok(Math.abs(r.inputUsdPerMillion-0.1)<1e-10);
 assert.ok(Math.abs(r.outputUsdPerMillion-0.6)<1e-10);
 assert.equal(PAID_SCIENCE_MODELS[modelId],"Inceptron");
 assert.throws(()=>verifyPaidZdrEndpoint({modelId,model,registry,endpoints,providerName:"Wrong Provider"}),/mismatch/);
 assert.throws(()=>verifyPaidZdrEndpoint({modelId,model,registry:{data:[]},endpoints,providerName:"Inceptron"}),/ZDR endpoint/);
 assert.throws(()=>verifyPaidZdrEndpoint({modelId,model,registry,endpoints:{data:{endpoints:[]}},providerName:"Inceptron"}),/ZDR endpoint/);
 assert.throws(()=>verifyPaidZdrEndpoint({modelId,model,registry,
  endpoints:{data:{endpoints:[{provider_name:"Inceptron",tag:"different",status:0,pricing:p}]}},
  providerName:"Inceptron"}),/unverified/);
});
test("every paid completion request is ZDR, no training, no fallback, only pinned provider and price ceiling",()=>{
 const routeData=route();
 const messages=[{role:"user",content:"Public published evidence only. Return JSON."}];
 const req=strictPaidRequest({route:routeData,messages,maxTokens:450});
 assert.deepEqual(req.provider.only,["Inceptron"]);
 assert.equal(req.provider.zdr,true);
 assert.equal(req.provider.data_collection,"deny");
 assert.equal(req.provider.allow_fallbacks,false);
 assert.ok(Math.abs(req.provider.max_price.prompt-(0.1+1e-8))<1e-10);
 assert.ok(Math.abs(req.provider.max_price.completion-(0.6+1e-8))<1e-10);
 assert.equal("models" in req,false);
 assert.equal(req.reasoning.effort,"low");
 assert.throws(()=>strictPaidRequest({route:{...routeData,zdrVerifiedAtMetadata:false},
  messages,maxTokens:450}),/ZDR/);
 assert.throws(()=>strictPaidRequest({route:routeData,messages,maxTokens:1700}),/output ceiling/);
});
test("budget reserves worst-case UTF-8 bytes plus output tokens, requires hard key/account cap",()=>{
 const r=route(),m=[{role:"user",content:"A short public excerpt."}];
 const cost=worstCaseReserveUsd(m,450,r);
 assert.ok(cost>0&&cost<MAX_PILOT_USD);
 assert.throws(()=>worstCaseReserveUsd(m,1700,r),/Invalid/);
 const cap=verifyAccountBudget({data:{limit:10,limit_remaining:4}},
  {data:{total_credits:10,total_usage:3}});
 assert.equal(cap.maxPilotUsd,0.25);
 assert.throws(()=>verifyAccountBudget({data:{limit:null,limit_remaining:null}},
  {data:{total_credits:10,total_usage:3}}),/not verifiable/);
 assert.throws(()=>verifyAccountBudget({data:{limit:10,limit_remaining:0.1}},
  {data:{total_credits:10,total_usage:3}}),/Insufficient/);
 assert.throws(()=>verifyAccountBudget({data:{limit:10,limit_remaining:4}},
  {data:{total_credits:10,total_usage:3}},{capUsd:1}),/must not exceed/);
});
