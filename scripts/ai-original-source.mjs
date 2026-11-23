/**
 * HPI-AI.6-T07.3: original publisher deposited abstract quantitative audit,
 * plus rights/access preflight for strictly registered CC BY version-of-record.
 *
 * npm run ai:science:original -- audit --item-ids claim:E08,claim:E13
 * npm run ai:science:original -- preflight --item-ids claim:E14,claim:E08
 */
import {readFile,mkdir,writeFile,stat} from "node:fs/promises";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {selectPrimaryCases} from "./ai-primary-provenance.mjs";
import {verifyPrimaryRecords,assertPrimaryBibliographicGate} from
 "../research-tools/ai-assist/primary-provenance.mjs";
import {enforceAbstractIntegrityGate} from
 "../research-tools/ai-assist/original-abstract-audit.mjs";
import {probeOriginalAccess,inspectOriginalVersionEligibility} from
 "../research-tools/ai-assist/fulltext-rights-preflight.mjs";
const DS="research/ai/evaluation-set-v1.json";
const OUTPUT="qa-artifacts/ai-original-abstract";
const args=process.argv.slice(2);
const param=name=>{const p=args.indexOf(name);return p<0?null:args[p+1]};
const ids=()=>param("--item-ids")?.split(",").map(x=>x.trim())??["claim:E08","claim:E13"];
async function persist(payload){
 await mkdir(OUTPUT,{recursive:true,mode:0o700});
 if(((await stat(OUTPUT)).mode&0o077)!==0)throw Error("Private research folder must be 0700");
 const file=join(OUTPUT,new Date().toISOString().replace(/[:.]/g,"-")+".json");
 await writeFile(file,JSON.stringify(payload,null,2)+"\n",{mode:0o600,flag:"wx"});
 return file;
}
async function main(){
 const command=args[0];
 if(!["audit","preflight","plan"].includes(command))
  throw Error("Usage: plan|audit|preflight [--item-ids claim:E08,claim:E13]");
 const ds=JSON.parse(await readFile(DS,"utf8"));
 const items=selectPrimaryCases(ds,ids());
 if(command==="plan"){
  console.log(JSON.stringify({task:"HPI-AI.6-T07.3",
   action:"original_deposited_abstract_audit_and_optional_rights_preflight",
   caseIds:items.map(x=>x.id),maxRegistryReads:items.length*2,
   maxOriginalPublisherHeadRequests:items.length,
   noPublisherContentGets:true,noCloudAI:true,noPaidAPIs:true},null,2));return;
 }
 const verified=await verifyPrimaryRecords({items});
 assertPrimaryBibliographicGate(verified,items);
 enforceAbstractIntegrityGate(verified,items);
 const probes=[];
 if(command==="preflight"){
  for(const record of verified.items)
   probes.push({itemId:record.itemId,record:await probeOriginalAccess(record)});
 }
 const result={schema:"hpi_ai6_t073_original_evidence_audit_v1",
  action:command,createdAt:new Date().toISOString(),
  sourceMetadata:verified,accessProbes:probes,
  originalFullTextsDownloaded:0,
  publisherAbstractsRetained:0,
  derivedOriginalSourceFacts:verified.items.map(x=>({
   id:x.itemId,doi:x.doi,
   sourceAbstractSha256:x.abstractClaimAudit?.depositedAbstractSha256??null,
   available:x.abstractClaimAudit?.available??false,
   sample:x.abstractClaimAudit?.sample??null,
   followUp:x.abstractClaimAudit?.followUp??null,
   originalReportedOutcome:x.abstractClaimAudit?.outcome??null,
   deltaPercentPointCalculations:x.abstractClaimAudit?.derivedComparisons?.comparisons??[],
   nullResult:x.abstractClaimAudit?.nullEffectReport??null,
   rightsStatus:x.rights?.rightsStatus??"unknown",
   fullTextPotential:inspectOriginalVersionEligibility(x).rightsAssessment
  })),
  scientificEffectsIndependentlyReplicated:0,
  publicationAuthorised:false,cloudAIInferenceCalls:0,paidCalls:0};
 const file=await persist(result);
 console.log(JSON.stringify({status:"private_source_evidence_audit_recorded",
  action:command,checked:verified.items.length,
  depositedAbstractsAvailable:verified.items.filter(x=>x.abstractClaimAudit?.available).length,
  recomputedAbstractArithmeticPairs:verified.items.reduce((n,x)=>n+
   (x.abstractClaimAudit?.derivedComparisons?.comparisons?.length??0),0),
  authorsReportedNullResultCount:verified.items.filter(
   x=>Boolean(x.abstractClaimAudit?.nullEffectReport)).length,
  licencesPotentiallySuitable:probes.filter(
   x=>x.record.declaredCcByVersionOfRecord).length,
  publisherAccessAvailable:probes.filter(
   x=>x.record.authenticatedOriginalPublisherAccess).length,
  probes:probes.map(x=>({id:x.itemId,license:x.record.rightsAssessment,
   httpStatus:x.record.httpStatus??null,access:x.record.reason,
   publisherTextDownloaded:false})),
  privateArtifact:file,originalStudyFullTextDownloaded:false,
  rawOriginalPublisherTextRetained:false,
  scientificPublicationAuthorised:false},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 await main().catch(e=>{console.error("HPI original source audit refused:",e.message);process.exitCode=2});
