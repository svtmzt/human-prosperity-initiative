/** Correction-aware preflight for a specific poverty RCT. Metadata/HEAD only.
 * Registry links may be absent; the correction relationship is an explicitly
 * curated source-backed requirement, not inferred from title similarity.
 * A public manifest is neither privacy clearance nor proof of access. */
import {createHash} from "node:crypto";
const paper="10.1093/qje/qjw025",erratum="10.1093/qje/qjx039",replication="10.23846/rps0020";
const originalPackage="10.7910/DVN/M2GAZN",externalPackage="10.7910/DVN/WUUJUO";
const crossref=doi=>"https://api.crossref.org/works/"+encodeURIComponent(doi);
const dv=doi=>"https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId="+encodeURIComponent("doi:"+doi);
const head=id=>"https://dataverse.harvard.edu/api/access/datafile/"+id;
const metadataUrls=[crossref(paper),crossref(erratum),crossref(replication),dv(originalPackage),dv(externalPackage)];
const MAX=750000;
const correctionPolicy=Object.freeze({
 source:"https://doi.org/"+erratum,
 explanatoryRecord:"https://collaborate.princeton.edu/en/publications/erratum-the-short-term-impact-of-unconditional-cash-transfers-to-/",
 tablesIandII:{fwerBootstrapIterations:10000,obsoleteIterations:1000},
 tableIII:{psychologicalWellbeingWeights:"none",leeBoundsAttritionSample:"entire_original_sample_including_missing_outcomes"},
 design:"village_and_household_randomization; separate direct and spillover contrasts",
 originalCorrectedInferenceRecomputed:false
});
const expectedFiles=[
 [3346781,"UCT_Village_Collapsed.tab",77946,"76aaf8063bc893922e2a1515c5cf9d41"],
 [3346780,"Erratum.tar",1045504,"f1f937964899d7615b7b91460b61b3d9"]
];
const hash=b=>createHash("sha256").update(b).digest("hex");
async function metadata(url,fetchImpl){
 if(!metadataUrls.includes(url))throw Error("Unapproved endpoint");
 const r=await fetchImpl(url,{method:"GET",redirect:"error",headers:{accept:"application/json"},signal:AbortSignal.timeout(12000)});
 if(!r.ok||!/application\/json/i.test(r.headers.get("content-type")??""))throw Error("Registry unavailable: HTTP "+r.status);
 if(Number(r.headers.get("content-length")??0)>MAX||!r.body?.getReader)throw Error("Registry response refused");
 const reader=r.body.getReader();const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
 if(size>MAX){await reader.cancel();throw Error("Registry response too large")}chunks.push(Buffer.from(value))}}
 finally{reader.releaseLock()}
 const b=Buffer.concat(chunks);return {value:JSON.parse(b.toString("utf8")),sha256:hash(b)};
}
function identity(doc,doi,year,pattern){
 const x=doc?.message;
 if(x?.DOI?.toLowerCase()!==doi||x.published?.["date-parts"]?.[0]?.[0]!==year||!pattern.test(x.title?.[0]??""))
 throw Error("Publication identity mismatch");
 return x;
}
function manifest(doc,id,version,minor,titlePattern){
 const d=doc?.data,v=d?.latestVersion;
 const title=v?.metadataBlocks?.citation?.fields?.find(f=>f.typeName==="title")?.value;
 if(doc?.status!=="OK"||d?.id!==id||v?.versionState!=="RELEASED"||v.versionNumber!==version||
 (v.versionMinorNumber??v.minorVersionNumber)!==minor||!titlePattern.test(title??"")||
 !Array.isArray(v.files)||v.files.length>50)throw Error("Unexpected package identity or version");
 return v;
}
export function auditKenyaRecords({original,correction,external,originalArchive,externalArchive}){
 const o=identity(original,paper,2016,/short.term impact of unconditional cash transfers.*kenya/is);
 identity(correction,erratum,2017,/erratum.*short.term impact of unconditional cash transfers.*kenya/is);
 identity(external,replication,2019,/replication study.*short.term effects in kenya/is);
 const a=manifest(originalArchive,2804943,2,0,/replication data for.*short.term impact.*kenya/is);
 const e=manifest(externalArchive,3493818,1,0,/replication data for.*replication study.*kenya/is);
 if(a.license?.rightsIdentifier!=="CC0-1.0"||a.files.length!==11)throw Error("Author package rights or file count changed");
 for(const [id,name,bytes,md5] of expectedFiles){
 const f=a.files.find(f=>f.dataFile?.id===id);
 if(!f||f.restricted!==false||f.dataFile.filename!==name||f.dataFile.filesize!==bytes||
 f.dataFile.checksum?.type!=="MD5"||f.dataFile.checksum.value!==md5)throw Error("Original file metadata changed");
 }
 const tabular=a.files.filter(f=>/\.tab$/i.test(f.dataFile?.filename??"")).length;
 if(tabular!==4||e.files.length!==4||e.files.some(f=>f.restricted!==false||!/\.(sas|do)$/i.test(f.dataFile?.filename??"")))throw Error("Package composition changed");
 // Fixed study-specific extraction of reported rounded figures, never read
 // as raw-data estimate or baseline/within-household effect.
 const abstract=(o.abstract??"").replace(/<[^>]*>/g," ").replace(/\s+/g," ");
 const m=/monthly consumption from \$158 PPP to \$193 PPP nine months/i.test(abstract);
 if(!m)throw Error("Published abstract consumption claim changed");
 return {classification:"CORRECTION_AWARE_FEASIBILITY_NOT_EXPERIMENT_REPLICATION",
 originalDoi:paper,correctionDoi:erratum,externalReplicationDoi:replication,
 correctionLinkSource:"explicit curated publication and Princeton record; Crossref relation not assumed",
 correctionRequirements:correctionPolicy,
 reportedAbstractArithmetic:{fromUsdPpp:158,toUsdPpp:193,differenceUsdPpp:35,relativeDifferencePercent:35/158*100,
 monthsAfterTransferBegan:9,roundedAuthorReportedAmounts:true,causalEstimateRecomputed:false},
 authorArchive:{doi:originalPackage,version:"2.0",license:"CC0-1.0",files:11,tabularFiles:4,selectedFileMetadata:expectedFiles.map(([id,name,bytes,md5])=>({id,name,bytes,declaredMd5:md5,contentVerified:false}))},
 externalArchive:{doi:externalPackage,version:"1.0",files:4,listedScriptFiles:4,listedDataFiles:0,license:e.license?.rightsIdentifier??"not_declared_in_manifest",scriptsExecuted:false},
 independentPublishedReplication:{source:"https://doi.org/"+replication,
 record:"https://3ieimpact.org/evidence-hub/publications/replication-papers/impact-unconditional-cash-transfers-replication-study",
 reportedConsistencyOnConsumptionAndOtherOutcomes:true,externalReportNotHpiExecution:true},
 rawDataDownloaded:false,participantDataAccessed:false,fullCorrectedAnalysisReplicated:false,
 scientificPublicationAuthorised:false};
}
export async function runKenyaAudit({fetchImpl=globalThis.fetch}={}){
 const responses=[];
 for(const url of metadataUrls)responses.push(await metadata(url,fetchImpl));
 const [original,correction,external,originalArchive,externalArchive]=responses.map(r=>r.value);
 const out=auditKenyaRecords({original,correction,external,originalArchive,externalArchive});
 const probes=[];
 for(const [id,name] of expectedFiles){
 let httpStatus=null;
 try{const r=await fetchImpl(head(id),{method:"HEAD",redirect:"manual",signal:AbortSignal.timeout(10000)});httpStatus=r.status}catch{}
 probes.push({id,name,httpStatus,accessStatus:httpStatus===200?"HEAD_OK_CONTENT_UNVERIFIED":httpStatus===403?"ACCESS_REFUSED":"ACCESS_UNCONFIRMED",downloaded:false});
 }
 return {...out,metadataSourceDigests:responses.map((r,i)=>({url:metadataUrls[i],sha256:r.sha256})),
  accessProbes:probes,publicMetadataGets:5,publicHeadAttempts:2,
  // Even HEAD 200 must not imply permission to retrieve participant data.
  correctedAnalysisReady:false,blocker:"Need lawfully accessible corrected data, data dictionary, privacy review and design-specific methods",paidAiCalls:0};
}
