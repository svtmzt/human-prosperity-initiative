import test from "node:test";
import assert from "node:assert/strict";
import {inspectOriginalVersionEligibility,probeOriginalAccess}
 from "../research-tools/ai-assist/fulltext-rights-preflight.mjs";
const doi="10.1007/s13209-026-00331-6";
const eligible=()=>({
 doi,canonicalUrl:"https://doi.org/"+doi,
 identityConfirmedByTwoCatalogues:true,
 rights:{publisherVersionLicenseSlug:"cc-by",
  crossrefDeclarations:[{url:"https://creativecommons.org/licenses/by/4.0",
   contentVersion:"vor",label:"crossref_cc_by_declaration"}]}
});
test("two agreeing publisher-version CC BY metadata signals create only POTENTIAL rights",()=>{
 const r=inspectOriginalVersionEligibility(eligible());
 assert.equal(r.declaredCcByVersionOfRecord,true);
 assert.equal(r.rightsAssessment,"publisher_version_cc_by_metadata_corroborated");
 assert.equal(r.publisherProbeUrl,"https://link.springer.com/article/"+doi);
 assert.equal(r.safeToDownloadFullText,false);
 assert.equal(r.safeToSendFullTextToCloud,false);
 assert.equal(r.authenticatedOriginalPublisherAccess,false);
});
test("license of repository copy alone is not publisher reuse licence",async()=>{
 const r=eligible();
 r.rights={bestOpenCopyLicenseSlug:"cc-by",
  publisherVersionLicenseSlug:null,crossrefDeclarations:[]};
 let calls=0;
 const checked=await probeOriginalAccess(r,{fetchImpl:async()=>{calls++;throw Error("must not fetch")}});
 assert.equal(checked.declaredCcByVersionOfRecord,false);
 assert.equal(checked.reason,"publisher_version_cc_by_not_corroborated");
 assert.equal(checked.networkRequests,0);
 assert.equal(calls,0);
});
test("unverified metadata and misleading DOI URL cannot request arbitrary host",()=>{
 const a=eligible();a.identityConfirmedByTwoCatalogues=false;
 assert.equal(inspectOriginalVersionEligibility(a).publisherProbeUrl,null);
 const b=eligible();b.canonicalUrl="https://evil.example/article/"+doi;
 assert.equal(inspectOriginalVersionEligibility(b).publisherProbeUrl,null);
 const c=eligible();c.doi="10.1016/j.enpol.2026.115143";
 c.canonicalUrl="https://doi.org/"+c.doi;
 assert.equal(inspectOriginalVersionEligibility(c).reason,"no_pinned_publisher_adapter");
});
test("HEAD-only preflight never follows publisher login redirect or downloads original text",async()=>{
 const calls=[];
 const result=await probeOriginalAccess(eligible(),{
  fetchImpl:async(url,options)=>{
   calls.push({url,options});
   return {status:303,headers:new Headers({
    location:"https://idp.springer.com/authorize",
    "content-type":"text/html"})};
  }});
 assert.equal(result.httpStatus,303);
 assert.equal(result.reason,"publisher_redirect_or_authentication_required");
 assert.equal(result.safeToDownloadFullText,false);
 assert.equal(result.authenticatedOriginalPublisherAccess,false);
 assert.equal(calls.length,1);
 assert.equal(calls[0].options.method,"HEAD");
 assert.equal(calls[0].options.redirect,"manual");
 assert.equal(calls[0].options.headers.authorization,undefined);
 assert.equal(calls[0].url,"https://link.springer.com/article/"+doi);
});
test("publisher returning 200 zero-byte API stub is still unavailable",async()=>{
 const r=await probeOriginalAccess(eligible(),{
  fetchImpl:async()=>({status:200,headers:new Headers({
   "content-type":"text/html","content-length":"0"})})});
 assert.equal(r.reason,"original_not_accessible_without_authentication");
 assert.equal(r.authenticatedOriginalPublisherAccess,false);
});
test("real 200 content-head does NOT grant a GET or redistribution approval",async()=>{
 const r=await probeOriginalAccess(eligible(),{
  fetchImpl:async()=>({status:200,headers:new Headers({
   "content-type":"text/html","content-length":"24012"})})});
 assert.equal(r.authenticatedOriginalPublisherAccess,true);
 assert.equal(r.safeToDownloadFullText,false);
 assert.equal(r.safeToSendFullTextToCloud,false);
 assert.equal(r.safeToRedistributeWithoutAttribution,false);
 assert.equal(r.networkRequests,1);
});
