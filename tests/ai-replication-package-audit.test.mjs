import test from "node:test";
import assert from "node:assert/strict";
import {
 HARVARD_SNAP_PACKAGE,readRegisteredDataversePackage,
 auditPublishedReplicationManifest,auditHarvardSnapPackage
} from "../research-tools/ai-assist/replication-package-audit.mjs";
const sha="a".repeat(64),md5="b".repeat(32);
const source=()=>({
 status:"OK",data:{id:3417529,latestVersion:{
  versionState:"RELEASED",versionNumber:1,minorVersionNumber:0,
  license:{name:"CC0 1.0",rightsIdentifier:"CC0-1.0"},
  metadataBlocks:{citation:{fields:[{
   typeName:"title",value:"Replication Data for: 'Take-up and Targeting: Experimental Evidence from SNAP'"
  }]}},
  files:[
   ...Array.from({length:11},(_,i)=>({
    label:"exhibit_"+i+".do",restricted:false,
    dataFile:{id:3417530+i,filename:"exhibit_"+i+".do",filesize:2048,
     checksum:{type:"MD5",value:md5}}})),
   {label:"ReadMe",restricted:false,
    dataFile:{id:3417578,filename:"ReadMe",filesize:3428,
     checksum:{type:"MD5",value:md5}}},
   {label:"variables_for_tables",restricted:false,
    dataFile:{id:3417579,filename:"variables_for_tables",filesize:3223,
     checksum:{type:"MD5",value:md5}}}
  ]
 }}});
const response=x=>new Response(JSON.stringify(x),{
 status:200,headers:{"content-type":"application/json"}});
test("real explicit reference source links paper to public author code, never raw effect replication",()=>{
 assert.equal(HARVARD_SNAP_PACKAGE.datasetDoi,"doi:10.7910/DVN/8AWKIL");
 assert.equal(HARVARD_SNAP_PACKAGE.sourceStudyDoi,"10.1093/qje/qjz013");
 const r=auditPublishedReplicationManifest({manifest:source(),manifestSha256:sha});
 assert.equal(r.publishedLicense,"CC0-1.0");
 assert.deepEqual(r.totals,{files:13,scripts:11,documentation:2,datasetFiles:0,other:0});
 assert.equal(r.feasibility,"code_and_documentation_only_no_reproduction_microdata");
 assert.equal(r.fullExperimentalReplicationExecuted,false);
 assert.equal(r.codeAvailabilityCannotProveReproducibility,true);
 assert.equal(r.onlyMetadataRead,true);
 assert.equal(r.scienceEffectReplications,0);
});
test("licence, version, dataset ID and title are strict release requirements",()=>{
 for(const mutate of [
  d=>{d.data.latestVersion.license.name="CC BY NC";},
  d=>{d.data.latestVersion.versionState="DRAFT";},
  d=>{d.data.id=1000;},
  d=>{d.data.latestVersion.metadataBlocks.citation.fields[0].value="Unrelated project";},
  d=>{d.status="ERROR";}
 ]){
  const d=source();mutate(d);
  assert.throws(()=>auditPublishedReplicationManifest({
   manifest:d,manifestSha256:sha}),/not verified/);
 }
});
test("files with access restrictions or suspicious names cannot be laundered through metadata",()=>{
 const x=source();x.data.latestVersion.files[0].restricted=true;
 assert.throws(()=>auditPublishedReplicationManifest({manifest:x,manifestSha256:sha}),
  /restricted/);
 const y=source();y.data.latestVersion.files[0].dataFile.filename="../../.ssh/id_rsa";
 assert.throws(()=>auditPublishedReplicationManifest({manifest:y,manifestSha256:sha}),
  /restricted/);
 const z=source();z.data.latestVersion.files[0].dataFile.checksum.value="invalid";
 assert.throws(()=>auditPublishedReplicationManifest({manifest:z,manifestSha256:sha}),
  /restricted/);
});
test("manifest containing a public CSV is NOT automatically an approved microdata source",()=>{
 const m=source();m.data.latestVersion.files.push({
  restricted:false,dataFile:{id:98766,filename:"individual_level.csv",filesize:4000,
   checksum:{type:"MD5",value:md5}}});
 const a=auditPublishedReplicationManifest({manifest:m,manifestSha256:sha});
 assert.equal(a.publishedMicrodataPresentInPackage,true);
 assert.equal(a.fullExperimentalReplicationExecuted,false);
 assert.equal(a.allOriginalRawDataAvailableForIndependentReplication,false);
 assert.equal(a.noFileExecution,true);
 assert.equal(a.noFileContentsRead,true);
 assert.match(a.feasibility,/require_separate_access_and_privacy_checks/);
});
test("official one-file catalog read is pinned, no credentials, no redirect",async()=>{
 const calls=[];
 const out=await auditHarvardSnapPackage({fetchImpl:async(url,options)=>{
  calls.push({url,options});return response(source());
 }});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,
  "https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi%3A10.7910%2FDVN%2F8AWKIL");
 assert.equal(calls[0].options.redirect,"error");
 assert.equal(calls[0].options.method,"GET");
 assert.equal(calls[0].options.headers.authorization,undefined);
 assert.ok(/^[a-f0-9]{64}$/.test(out.manifestSha256));
 assert.equal(out.noPublisherOrDataFileDownloads,true);
 assert.equal(out.originalPublicMetadataReadCount,1);
});
test("catalog redirects, HTML, oversized content and unknown state fail closed",async()=>{
 const redirect=await readRegisteredDataversePackage({fetchImpl:async()=>new Response("",{
  status:302,headers:{location:"https://example.com/secret"}})});
 assert.equal(redirect.ok,false);
 const html=await readRegisteredDataversePackage({fetchImpl:async()=>new Response("<html>",{
  headers:{"content-type":"text/html"}})});
 assert.equal(html.ok,false);
 const huge=await readRegisteredDataversePackage({fetchImpl:async()=>new Response(
  "x".repeat(800000),{headers:{"content-type":"application/json"}})});
 assert.equal(huge.ok,false);
 const no=await readRegisteredDataversePackage({fetchImpl:async()=>{throw Error("no network")}});
 assert.equal(no.reason,"metadata_unavailable_or_redirect_refused");
});
test("invalid digest is never interpreted as content-file checksum validation",()=>{
 assert.throws(()=>auditPublishedReplicationManifest({manifest:source(),
  manifestSha256:"NOT_A_SHA"}),/not verified/);
 const out=auditPublishedReplicationManifest({manifest:source(),manifestSha256:sha});
 assert.ok(out.files.every(f=>f.checksumAlgorithm==="MD5_declared_not_content_verified"));
 assert.ok(out.files.every(f=>f.rawContentDownloaded===false));
});
