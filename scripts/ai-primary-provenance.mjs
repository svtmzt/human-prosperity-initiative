/**
 * HPI-AI.6-T07.2 — public original-DOI bibliographic registry preflight.
 * Runs without model, personal data, credentials, full text or paid API calls.
 * Output stays private, Git-ignored; no scientific publication authority.
 *
 * npm run ai:science:primary -- verify --item-ids claim:E08,claim:E13
 * npm run ai:science:primary -- discover --seed claim:E13
 */
import {readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {classifySource} from "../research-tools/ai-assist/policy.mjs";
import {scanForInjection} from "../research-tools/ai-assist/safeguards.mjs";
import {PRIMARY_MAX_ITEMS,verifyPrimaryRecords,discoverRelatedDois} from
 "../research-tools/ai-assist/primary-provenance.mjs";

const DATASET="research/ai/evaluation-set-v1.json";
const OUTPUT="qa-artifacts/ai-primary-sources";
const args=process.argv.slice(2);
const arg=name=>{const p=args.indexOf(name);return p<0?null:args[p+1]};
const ids=()=>arg("--item-ids")?.split(",").map(x=>x.trim())??["claim:E08","claim:E13"];
const root=()=>readFile(DATASET,"utf8").then(JSON.parse);
export function selectPrimaryCases(dataset,chosen){
 if(!Array.isArray(dataset?.items)||!Array.isArray(chosen)||
  !chosen.length||chosen.length>PRIMARY_MAX_ITEMS||
  new Set(chosen).size!==chosen.length)throw Error("Choose 1-3 unique source cases");
 const byId=new Map(dataset.items.map(x=>[x.id,x]));
 return chosen.map(id=>{
  const item=byId.get(id);
  if(!item||!Array.isArray(item.sources)||item.sources.length!==1)
   throw Error("Unknown/ambiguous source case "+id);
  const s=item.sources[0],cl=classifySource(s);
  if(!/^[A-Za-z0-9:._-]{3,100}$/.test(id)||
   !/^[A-Za-z0-9:._-]{2,100}$/.test(s.id)||
   cl.dataClass!=="public_research_metadata"||cl.personalData?.length||
   typeof s.text!=="string"||s.text.length<20||s.text.length>6500||
   scanForInjection(s.text).length)
   throw Error("Unsafe or unapproved source refused "+id);
  // Neither the reference/ground truth labels nor any model output can escape.
  return {id,task:item.task,sources:[{id:s.id,url:s.url,
   text:s.text,dataClass:"public_research_metadata"}]};
 });
}
async function privateWrite(out){
 await mkdir(OUTPUT,{recursive:true,mode:0o700});
 if(((await stat(OUTPUT)).mode&0o077)!==0)throw Error("Private source folder must be 0700");
 const file=join(OUTPUT,new Date().toISOString().replace(/[:.]/g,"-")+".json");
 await writeFile(file,JSON.stringify(out,null,2)+"\n",{flag:"wx",mode:0o600});
 return file;
}
async function main(){
 const action=args[0]??"help";
 if(!["verify","discover","plan"].includes(action))
  throw Error("Use verify [--item-ids id,id], discover --seed id, or plan");
 const ds=await root();
 if(action==="plan"){
  const items=selectPrimaryCases(ds,ids());
  console.log(JSON.stringify({action:"verify_public_registry_metadata",
   sourceIds:items.map(x=>x.id),
   maxExternalReadOnlyRegistryCalls:2*items.length,
   noPrivateData:true,cloudInferenceCalls:0,paidModelCalls:0,
   fullTextRequests:0,scientificFindingsVerified:0,
   publicationAuthorised:false},null,2));return;
 }
 if(action==="verify"){
  const items=selectPrimaryCases(ds,ids());
  const result=await verifyPrimaryRecords({items});
  const file=await privateWrite(result);
  console.log(JSON.stringify({action,sourceItems:result.sourceCount,
   corroboratedBibliographicIdentities:result.verifiedRecordCount,
   unverified:result.failedOrUnsupportedCount,
   calls:result.registryRequests,
   records:result.items.map(x=>({
    caseId:x.itemId,doi:x.doi,status:x.status,
    title:x.crossref?.title??null,year:x.crossref?.publicationYear??null,
    detectedOpenCopyLicense:x.rights?.bestOpenCopyLicenseSlug??null,
    copyTermsRestricted:x.rights?.bestOpenCopyHasRestrictedTerms??null,
    depositedAbstractPercentageSignal:x.abstractNumericalSignal??null,
    originalFindingVerified:false})),
   privateArtifact:file,paidModelCalls:0,
   publisherFullTextDownloaded:false,originalFindingVerified:false,
   publicationAuthorised:false},null,2));return;
 }
 const seed=arg("--seed");
 if(!seed)throw Error("--seed is required for autonomous discovery");
 const items=selectPrimaryCases(ds,[seed]);
 const registry=await verifyPrimaryRecords({items});
 const paper=registry.items[0];
 if(!paper.identityConfirmedByTwoCatalogues)
  throw Error("Cannot discover from an unresolved bibliographic source: "+seed);
 const result=await discoverRelatedDois({seed:paper,maxCandidates:2});
 const artifact={classification:"PRIVATE_RELATED_PUBLICATION_DISCOVERY_NOT_SCIENTIFIC_PROOF",
  seedId:seed,seedRegistryRecord:paper,discovery:result,
  noPublisherTextDownloaded:true,publicationAuthorised:false};
 const file=await privateWrite(artifact);
 console.log(JSON.stringify({action,seed,queryFromRegisteredTitle:result.topic,
  discoveredCandidateCount:result.candidates?.length??0,
  candidates:result.candidates?.map(x=>({doi:x.doi,title:x.title,
   registrationCorroborated:x.registrationCorroborated,
   possibleOriginalResultUnverified:true})),
  registryReadOnlyCalls:registry.registryRequests+result.registryRequests,
  paidModelCalls:0,fullTextDownloaded:false,privateArtifact:file,
  publicationAuthorised:false},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 await main().catch(e=>{console.error("HPI primary-source preflight refused:",e.message);process.exitCode=2});
