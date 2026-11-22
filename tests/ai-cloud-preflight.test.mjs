import test from "node:test";
import assert from "node:assert/strict";
import {
 declaredZeroTokenPrice,readOnlyCloudPreflight,OPENROUTER_MODELS_URL,
 OPENROUTER_ZDR_URL
} from "../research-tools/ai-assist/cloud-preflight.mjs";

const free=id=>({id,pricing:{prompt:"0",completion:"0",request:"0"}});
const paid=id=>({id,pricing:{prompt:"0.00001",completion:"0.00002"}});
test("strict free-price check rejects missing, nonzero or malformed pricing",()=>{
 assert.equal(declaredZeroTokenPrice(free("example/model:free")),true);
 assert.equal(declaredZeroTokenPrice(paid("example/model:free")),false);
 assert.equal(declaredZeroTokenPrice({id:"x:free"}),false);
 assert.equal(declaredZeroTokenPrice({...free("x:free"),pricing:{prompt:"0",completion:"0",request:"NaN"}}),false);
 assert.equal(declaredZeroTokenPrice(free("example/paid")),false);
});
test("preflight is exactly two unauthenticated GETs and never treats ZDR listing as endpoint approval",async()=>{
 const urls=[];
 const fetchImpl=async(url,opts)=>{
  urls.push(url);
  assert.equal(opts.method,"GET");
  assert.equal(opts.redirect,"error");
  assert.equal(opts.headers.Authorization,undefined);
  const data=url===OPENROUTER_MODELS_URL?[
   free("inclusionai/ling-3.2-flash:free"),free("baidu/ernie-5.5-flash-preview:free"),
   paid("x/notfree:free"),free("x/new:free"),paid("x/paid")
  ]:[free("inclusionai/ling-3.2-flash:free"),free("x/notfree:free")];
  return {ok:true,json:async()=>({data})};
 };
 const r=await readOnlyCloudPreflight({fetchImpl,now:()=>new Date("2026-11-22T13:00:00Z")});
 assert.deepEqual(urls,[OPENROUTER_MODELS_URL,OPENROUTER_ZDR_URL]);
 assert.equal(r.freeCataloguedCount,3);
 assert.equal(r.freeListedZdrCount,1);
 assert.equal(r.inferencePerformed,false);
 assert.equal(r.perEndpointZdrVerified,false);
 assert.equal(r.scientificBenchmarkCompleted,false);
 assert.equal(r.autoPublishAuthorised,false);
 assert.equal(r.paidRequestPerformed,false);
 assert.equal(r.candidates.find(x=>x.id.startsWith("baidu/")).catalogOnlyCandidate,false);
 assert.equal(r.candidates.find(x=>x.id.startsWith("inclusionai/")).catalogOnlyCandidate,true);
 assert.ok(r.candidates.every(x=>x.callableWithoutFreshEndpointPolicyCheck===false));
});
test("preflight fails closed on HTTP errors and malformed catalogue",async()=>{
 await assert.rejects(()=>readOnlyCloudPreflight({
  fetchImpl:async()=>({ok:false,status:403})}),/failed closed/);
 await assert.rejects(()=>readOnlyCloudPreflight({
  fetchImpl:async()=>({ok:true,json:async()=>({data:{bad:true}})})}),/Unexpected/);
 await assert.rejects(()=>readOnlyCloudPreflight({
  fetchImpl:async()=>({ok:true,json:async()=>({data:[{notId:true}]})})}),/Invalid/);
});
