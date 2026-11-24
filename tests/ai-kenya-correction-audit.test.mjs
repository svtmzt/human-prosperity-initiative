import test from "node:test";
import assert from "node:assert/strict";
import {auditKenyaRecords,runKenyaAudit} from "../research-tools/ai-assist/kenya-correction-audit.mjs";
const paper="10.1093/qje/qjw025",correction="10.1093/qje/qjx039",rep="10.23846/rps0020";
const pub=(DOI,year,title,abstract)=>({message:{DOI,title:[title],published:{"date-parts":[[year]]},abstract}});
const file=(id,filename,filesize=100,md5="0".repeat(32))=>({restricted:false,dataFile:{id,filename,filesize,checksum:{type:"MD5",value:md5}}});
const archive=(id,version,title,files,license)=>({status:"OK",data:{id,latestVersion:{versionState:"RELEASED",versionNumber:version,versionMinorNumber:0,license:license?{rightsIdentifier:license}:undefined,metadataBlocks:{citation:{fields:[{typeName:"title",value:title}]}},files}}});
const fixture=()=>({
 original:pub(paper,2016,"The Short-term Impact of Unconditional Cash Transfers to the Poor: Experimental Evidence from Kenya","monthly consumption from $158 PPP to $193 PPP nine months"),
 correction:pub(correction,2017,"Erratum to The Short-Term Impact of Unconditional Cash Transfers to the Poor: Experimental Evidence from Kenya"),
 external:pub(rep,2019,"Impact of unconditional cash transfers: a replication study of the short-term effects in Kenya"),
 originalArchive:archive(2804943,2,"Replication Data for: The Short-Term Impact Of Unconditional Cash Transfers To The Poor: Experimental Evidence From Kenya",[
 file(3346781,"UCT_Village_Collapsed.tab",77946,"76aaf8063bc893922e2a1515c5cf9d41"),
 file(3346780,"Erratum.tar",1045504,"f1f937964899d7615b7b91460b61b3d9"),
 ...Array.from({length:3},(_,i)=>file(10+i,"synthetic_"+i+".tab")),
 ...Array.from({length:6},(_,i)=>file(20+i,"synthetic_"+i+".tar"))
 ],"CC0-1.0"),
 externalArchive:archive(3493818,1,"Replication Data for: Impact of unconditional cash transfers: A replication study of the short-term effects in Kenya",Array.from({length:4},(_,i)=>file(30+i,"synthetic_"+i+".do")))
});
const response=x=>new Response(JSON.stringify(x),{headers:{"content-type":"application/json"}});
test("corrected methods and reported arithmetic are separate from actual replication",()=>{
 const r=auditKenyaRecords(fixture());
 assert.equal(r.correctionRequirements.tablesIandII.fwerBootstrapIterations,10000);
 assert.equal(r.correctionRequirements.tableIII.psychologicalWellbeingWeights,"none");
 assert.equal(r.correctionRequirements.tableIII.leeBoundsAttritionSample,"entire_original_sample_including_missing_outcomes");
 assert.equal(r.reportedAbstractArithmetic.differenceUsdPpp,35);
 assert.equal(r.reportedAbstractArithmetic.causalEstimateRecomputed,false);
 assert.equal(r.fullCorrectedAnalysisReplicated,false);
 assert.equal(r.externalArchive.listedDataFiles,0);
 assert.equal(r.independentPublishedReplication.externalReportNotHpiExecution,true);
});
test("wrong study, omitted correction, or mismatched version fails closed",()=>{
 for(const change of [f=>f.original.message.DOI=rep,f=>delete f.correction,f=>f.correction.message.published["date-parts"]=[[2016]],f=>f.originalArchive.data.latestVersion.versionNumber=1,f=>f.external.message.title=["unrelated"]]){
 const f=fixture();change(f);assert.throws(()=>auditKenyaRecords(f));
 }
});
test("changed licence, file fingerprint, restricted file or composition requires new review",()=>{
 for(const change of [f=>f.originalArchive.data.latestVersion.license.rightsIdentifier="unknown",f=>f.originalArchive.data.latestVersion.files[0].restricted=true,f=>f.originalArchive.data.latestVersion.files[1].dataFile.checksum.value="fake",f=>f.externalArchive.data.latestVersion.files[0].dataFile.filename="people.csv"]){
 const f=fixture();change(f);assert.throws(()=>auditKenyaRecords(f));
 }
});
test("changed abstract numbers cannot silently retain old arithmetic",()=>{
 const f=fixture();f.original.message.abstract=f.original.message.abstract.replace("193","190");
 assert.throws(()=>auditKenyaRecords(f),/consumption claim changed/);
});
test("live runner uses five fixed metadata GETs and two HEADs; 403 and redirect never enable analysis",async()=>{
 const f=fixture(),calls=[],docs=Object.values(f);
 const r=await runKenyaAudit({fetchImpl:async(url,options)=>{
 calls.push({url,options});
 if(options.method==="GET")return response(docs[calls.length-1]);
 return new Response(null,{status:calls.length===6?403:303,headers:{location:"https://example.org/login"}});
 }});
 assert.equal(calls.length,7);assert.ok(calls.slice(0,5).every(c=>c.options.redirect==="error"&&c.options.method==="GET"));
 assert.ok(calls.slice(5).every(c=>c.options.redirect==="manual"&&c.options.method==="HEAD"));
 assert.deepEqual(r.accessProbes.map(x=>x.httpStatus),[403,303]);
 assert.equal(r.correctedAnalysisReady,false);
 assert.equal(r.rawDataDownloaded,false);
 assert.ok(r.metadataSourceDigests.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
});
test("even HEAD 200 never authorises downloading or analysis",async()=>{
 const docs=Object.values(fixture());let i=0;
 const r=await runKenyaAudit({fetchImpl:async(_,options)=>options.method==="GET"?response(docs[i++]):new Response(null,{status:200})});
 assert.equal(r.correctedAnalysisReady,false);
 assert.ok(r.accessProbes.every(x=>x.downloaded===false));
});
test("metadata failure refuses run without any further source access",async()=>{
 let calls=0;
 await assert.rejects(runKenyaAudit({fetchImpl:async()=>{calls++;return new Response(null,{status:403})}}),/Registry unavailable/);
 assert.equal(calls,1);
});
