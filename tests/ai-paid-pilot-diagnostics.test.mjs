import test from "node:test";
import assert from "node:assert/strict";
import {compareInternallyCuratedClaimLabels} from "../research-tools/ai-assist/pilot-diagnostics.mjs";
const items=[{id:"claim:E13",task:"claim-extraction",
 reference:{claims:[{direction:"null",endpointLevel:"receipt"}]}}];
const results=(acceptedItems)=>[{model:"model-a",
 report:{results:[{itemId:"claim:E13",acceptedItems}]}}];
test("internal benchmark flags wrong endpoint and never claims scientific validation",()=>{
 const r=compareInternallyCuratedClaimLabels(items,results([
  {direction:"null",endpointLevel:"earnings"},
  {direction:"descriptive",endpointLevel:"descriptive_context"}
 ]));
 assert.equal(r.models[0].expectedMatched,0);
 assert.equal(r.models[0].expectedMissing,1);
 assert.equal(r.models[0].additionalClaimsNeedingReview,2);
 assert.equal(r.independentScientificValidation,false);
 assert.equal(r.notForScientificPublication,true);
});
test("internal benchmark correctly accounts for extra duplicate claims and reversal",()=>{
 const r=compareInternallyCuratedClaimLabels(items,results([
  {direction:"null",endpointLevel:"receipt"},
  {direction:"null",endpointLevel:"receipt"},
  {direction:"supports",endpointLevel:"receipt"}
 ]));
 assert.equal(r.models[0].expectedMatched,1);
 assert.equal(r.models[0].expectedMissing,0);
 assert.equal(r.models[0].additionalClaimsNeedingReview,2);
 assert.equal(r.models[0].duplicateLabelPairs,1);
 assert.equal(r.models[0].nullAdverseReversedToSupports,1);
});
