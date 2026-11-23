/**
 * HPI-AI.6-T07.3b — author-source replication-package feasibility audit.
 *
 * Single explicitly registered Harvard Dataverse DOI, published package
 * metadata only. Never GET/execute scripts, files, participant microdata,
 * arbitrary URLs, credentials or AI services. Code != reproducible data.
 */
import {createHash} from "node:crypto";
const DATASET_DOI="doi:10.7910/DVN/8AWKIL";
const API="https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi%3A10.7910%2FDVN%2F8AWKIL";
const MAX=750_000;
const hash=s=>createHash("sha256").update(s).digest("hex");
export const HARVARD_SNAP_PACKAGE={
 datasetDoi:DATASET_DOI,
 sourceStudyDoi:"10.1093/qje/qjz013",
 registryRecord:"https://doi.org/10.7910/DVN/8AWKIL",
 provenanceProvider:"Harvard Dataverse",
 accessScope:"published_manifest_only"
};
export async function readRegisteredDataversePackage({
 fetchImpl=globalThis.fetch
}={}){
 let response;
 try{
  response=await fetchImpl(API,{method:"GET",redirect:"error",
   headers:{accept:"application/json","user-agent":"HPI-AI6-reproducibility/0.1"},
   signal:AbortSignal.timeout(12000)});
 }catch{return {ok:false,reason:"metadata_unavailable_or_redirect_refused"}}
 if(!response?.ok)return {ok:false,reason:"http_"+String(response?.status)};
 if(!/application\/json/i.test(response.headers?.get?.("content-type")??""))
  return {ok:false,reason:"non_json"};
 const size=Number(response.headers.get("content-length")??0);
 if(size>MAX)return {ok:false,reason:"metadata_exceeds_limit"};
 if(!response.body?.getReader)return {ok:false,reason:"missing_response_stream"};
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.length;
   if(total>MAX){await reader.cancel();return {ok:false,reason:"too_large"}}
   chunks.push(value);
  }
  const buf=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){buf.set(chunk,offset);offset+=chunk.length}
  const raw=new TextDecoder("utf-8",{fatal:true}).decode(buf);
  return {ok:true,json:JSON.parse(raw),manifestSha256:hash(raw),bytes:total};
 }catch{return {ok:false,reason:"invalid_json"}}
 finally{reader.releaseLock()}
}
const safeFilename=s=>typeof s==="string"&&
 s.length>0&&s.length<=95&&!/[\\/\0<>]/.test(s);
export function auditPublishedReplicationManifest({
 manifest,manifestSha256="0".repeat(64)
}={}){
 const d=manifest?.data,v=d?.latestVersion;
 const license=v?.license;
 const accepted=license?.rightsIdentifier==="CC0-1.0"&&
  /^CC0 1\.0$/.test(license?.name??"")&&
  v?.versionState==="RELEASED"&&
  manifest?.status==="OK"&&d?.id===3417529&&
  Array.isArray(v?.files)&&v.files.length>0&&v.files.length<=100&&
  v?.metadataBlocks?.citation?.fields?.some(f=>
   f.typeName==="title"&&/replication data for/i.test(f.value??"")&&
   /take.up and targeting.*snap/i.test(f.value??""))&&
  /^[a-f0-9]{64}$/.test(manifestSha256);
 if(!accepted)throw Error("Original replication package provenance/licence/version not verified");
 const fileEntries=v.files.map(f=>{
  const df=f.dataFile,name=df?.filename;
  if(!safeFilename(name)||!Number.isSafeInteger(df?.id)||
   !Number.isSafeInteger(df.filesize)||df.filesize<0||
   typeof f.restricted!=="boolean"||
   f.restricted||!df.checksum||df.checksum.type!=="MD5"||
   !/^[a-f0-9]{32}$/i.test(df.checksum.value??""))
   throw Error("Unusable or restricted replication manifest file");
  const code=/\.do$/i.test(name),docs=/^readme$/i.test(name)||
    /\.(?:txt|md|pdf)$/i.test(name)||name==="variables_for_tables";
  const data=/\.(?:dta|csv|tsv|xlsx|xls|sav|parquet|rds|rdata|feather|jsonl)$/i.test(name);
  return {fileId:df.id,name,bytes:df.filesize,
   kind:code?"replication_script":data?"data_file":docs?"documentation":"other",
   checksumAlgorithm:"MD5_declared_not_content_verified",
   registeredChecksum:df.checksum.value,
   restricted:f.restricted,rawContentDownloaded:false};
 });
 const counts={scripts:fileEntries.filter(f=>f.kind==="replication_script").length,
  documentation:fileEntries.filter(f=>f.kind==="documentation").length,
  datasetFiles:fileEntries.filter(f=>f.kind==="data_file").length,
  other:fileEntries.filter(f=>f.kind==="other").length};
 const hasData=counts.datasetFiles>0;
 const metadataContainsNoExecutableCode=fileEntries.every(f=>f.rawContentDownloaded===false);
 return {schema:"hpi_ai6_t073b_replication_manifest_audit_v1",
  datasetDoi:DATASET_DOI,sourceStudyDoi:HARVARD_SNAP_PACKAGE.sourceStudyDoi,
  catalog:"Harvard Dataverse",sourceUrl:API,
  packageVersion:String(v.versionNumber??"?")+"."+
   String(v.versionMinorNumber??v.minorVersionNumber??0),
  publishedLicense:"CC0-1.0",licenseConfirmedForManifest:true,
  manifestSha256,datasetReleaseState:v.versionState,
  files:fileEntries,totals:{files:fileEntries.length,...counts},
  publicScriptsAvailable:counts.scripts>0,
  publishedMicrodataPresentInPackage:hasData,
  allOriginalRawDataAvailableForIndependentReplication:false,
  fullExperimentalReplicationExecuted:false,
  onlyMetadataRead:metadataContainsNoExecutableCode,
  noFileContentsRead:true,noFileExecution:true,
  codeAvailabilityCannotProveReproducibility:true,
  feasibility:hasData?"possible_data_files_require_separate_access_and_privacy_checks":
   "code_and_documentation_only_no_reproduction_microdata",
  pendingRequirements:[
   "Verify author-referenced source datasets and legal/ethical constraints before retrieval",
   "Check whether scripts depend on restricted administrative participant-level data",
   "Never execute downloaded Stata scripts or assume access to participant microdata",
   "Independent statistical reproduction requires actual permitted datasets, code environment and execution logs"
  ],
  scienceEffectReplications:0,
  publishableNovelAIResearch:false};
}
export async function auditHarvardSnapPackage({fetchImpl=globalThis.fetch}={}){
 const fetched=await readRegisteredDataversePackage({fetchImpl});
 if(!fetched.ok)throw Error("Original package unavailable: "+fetched.reason);
 const audit=auditPublishedReplicationManifest({
  manifest:fetched.json,manifestSha256:fetched.manifestSha256
 });
 return {...audit,sourceRetrievedAt:new Date().toISOString(),
  originalPublicMetadataReadCount:1,
  noPublisherOrDataFileDownloads:true};
}
