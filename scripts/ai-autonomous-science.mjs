/**
 * HPI-AI.6-T07 — private bounded, autonomous AI-first research controller.
 * Examples (executed on authorised HPI Mac):
 *   npm run ai:science:auto -- plan --item-ids claim:E08,claim:E13
 *   npm run ai:science:auto -- run --allow-local-inference --item-ids claim:E08,claim:E13
 *
 * STRICT: only native Ollama loopback; 2 local models + 9B critic, no paid,
 * cloud, participant data, publication or field action.
 */
import {readFile,mkdir,writeFile,rmdir,stat} from "node:fs/promises";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {readAiConfig} from "../research-tools/ai-assist/config.mjs";
import {buildProvider} from "../research-tools/ai-assist/runtime.mjs";
import {runScientificPanel} from "../research-tools/ai-assist/scientific-validation.mjs";
import {verifyPrimaryRecords,assertPrimaryBibliographicGate,
 discoverRelatedDois} from "../research-tools/ai-assist/primary-provenance.mjs";
import {loadVerifiedPlatform} from "./platform-verify.mjs";
import {outputSchemaFor} from "../research-tools/ai-assist/safeguards.mjs";
import {needsAutonomousRecheck,buildRecheckMessages,validateRecheckReply,mergeAutonomousRechecks} from "../research-tools/ai-assist/autonomous-recheck.mjs";
import {planAutonomousCycle,buildAdversarialMessages,
 validateAdversarialReply,verifyAutonomousCycle} from "../research-tools/ai-assist/autonomous-science.mjs";

const DATASET_PATH="research/ai/evaluation-set-v1.json";
const DIR="qa-artifacts/ai-autonomous-science";
const PRIMARY_MODEL="qwen3.5:4b-q4_K_M";
const CRITIC_MODEL="qwen3.5:9b";
const ALLOWED_MODELS=[PRIMARY_MODEL,CRITIC_MODEL];
const SOURCE_IDS=["claim:E08","claim:E13"];
const MAX_OUTPUT=1100;
const args=process.argv.slice(2);
const flag=name=>args.includes(name);
const param=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null};
const selectedIds=()=>param("--item-ids")?param("--item-ids").split(",").map(x=>x.trim()):SOURCE_IDS;
async function localNative(model){
 const cfg=readAiConfig({
  HPI_AI_PROVIDER:"local",HPI_AI_MODEL:model,HPI_AI_LOCAL_RUNTIME:"ollama",
  HPI_AI_LOCAL_API:"native",HPI_AI_BASE_URL:"http://127.0.0.1:11434",
  HPI_AI_MAX_REQUESTS:"3",HPI_AI_MAX_INPUT_CHARS:"12000",
  HPI_AI_MAX_OUTPUT_TOKENS:String(MAX_OUTPUT),
  HPI_AI_LOCAL_NUM_CTX:"8192",HPI_AI_TIMEOUT_MS:"90000",
  HPI_AI_MAX_RETRIES:"0"
 });
 if(!ALLOWED_MODELS.includes(model)||!cfg.available||
  cfg.kind!=="local"||cfg.runtime!=="ollama"||cfg.localApi!=="native"||
  cfg.baseUrl!=="http://127.0.0.1:11434")
  throw Error("Local native model policy refused");
 const x=await buildProvider(cfg,{task:"claim-extraction",env:{}});
 if(!x.provider.available||x.provider.boundary!=="local"||
  x.provider.model!==model||x.provider.kind!=="local")
  throw Error("Exact native local model unavailable: "+model);
 return {id:model,family:"qwen",config:cfg,provider:x.provider};
}
async function run(){
 if(!flag("--allow-local-inference"))throw Error("Explicit --allow-local-inference is required");
 const data=JSON.parse(await readFile(DATASET_PATH,"utf8"));
 const plan=planAutonomousCycle({dataset:data,itemIds:selectedIds()});
 await mkdir(DIR,{recursive:true,mode:0o700});
 if(((await stat(DIR)).mode&0o077)!==0)throw Error("Private output folder must be 0700");
 const lock=join(DIR,".single-flight");
 await mkdir(lock,{mode:0o700}); // atomic: bounded single run, no duplicate inference
 try{
  // HPI's original summaries remain the only source TEXT supplied to models.
  // The public registries validate DOI/title/rights signals only, never effects.
  const primary=await verifyPrimaryRecords({items:plan.items});
  assertPrimaryBibliographicGate(primary,plan.items);
  const {kb}=await loadVerifiedPlatform();
  const vocab={mechanismIds:[...kb.mechanisms.keys()],
   endpointLevels:kb.parsed.claims.endpointLevels};
  const candidates=[];
  for(const model of ALLOWED_MODELS)candidates.push(await localNative(model));
  const panel=await runScientificPanel({task:plan.task,items:plan.items,candidates,vocab,maxModels:2});
  const critic=candidates[1];
  const critiques=[],critiqueCallLog=[];
  for(const item of plan.items){
   const messages=buildAdversarialMessages(item,panel.privateReports);
   const r=await critic.provider.complete(messages,{maxTokens:MAX_OUTPUT});
   critiqueCallLog.push({itemId:item.id,called:true,ok:r.ok===true,
    servedModel:r.model??null,status:r.status??"unknown",
    approximateTokens:r.usage?.completionTokens??null});
   critiques.push(r.ok&&r.model===CRITIC_MODEL?
    validateAdversarialReply({item,raw:r.content,criticModel:CRITIC_MODEL}):
    {itemId:item.id,sourceId:item.sources[0].id,criticModel:CRITIC_MODEL,
     valid:false,verdict:"unavailable",flags:[],failure:r.status??"provider_failure"});
  }
  const preliminary=verifyAutonomousCycle({plan,
   reports:panel.privateReports,critiques});
  const rechecks=[];
  for(const outcome of preliminary.outcomes){
   if(!needsAutonomousRecheck(outcome))continue;
   const item=plan.items.find(x=>x.id===outcome.itemId);
   const messages=buildRecheckMessages({item,vocab});
   const r=await critic.provider.complete(messages,{maxTokens:MAX_OUTPUT,
    schema:outputSchemaFor(plan.task,{allowedMechanismIds:vocab.mechanismIds,
     endpointLevels:vocab.endpointLevels})});
   if(r.ok&&r.model===CRITIC_MODEL){
    rechecks.push(validateRecheckReply({item,raw:r.content,model:CRITIC_MODEL,vocab}));
   }else{
    rechecks.push({itemId:item.id,model:CRITIC_MODEL,status:r.status??"failed",
     acceptedItems:[],rejected:[r.reason??"no_verifiable_response"]});
   }
  }
  const outcome=mergeAutonomousRechecks({decision:preliminary,rechecks});
  // Automatically search for NEW registered publications when a disagreement
  // persists. This is related-study discovery, not new verified claim evidence.
  const followUpSources=[];
  for(const row of outcome.outcomes){
   if(!["unresolved_after_autonomous_recheck","quarantined_for_automated_evidence_check",
      "unresolved_no_recheck"].includes(row.status))continue;
   const seed=primary.items.find(x=>x.itemId===row.itemId);
   const discovery=await discoverRelatedDois({seed,maxCandidates:2});
   followUpSources.push({itemId:row.itemId,discovery});
  }
  const externalRegistryCalls=primary.registryRequests+
    followUpSources.reduce((n,r)=>n+r.discovery.registryRequests,0);
  if(externalRegistryCalls>plan.items.length*5)
   throw Error("Public metadata read ceiling exceeded");
  const observedFirstPass=panel.privateReports.reduce((n,x)=>n+x.report.totals.requests,0);
  const count=observedFirstPass+critiqueCallLog.length+rechecks.length;
  if(count>plan.maxLocalCalls)throw Error("Native inference exceeded hard planned ceiling");
  const artifact={classification:"PRIVATE_AUTONOMOUS_AI_RESEARCH_NOT_SCIENTIFIC_GOLD",
   runAt:new Date().toISOString(),plan,modelRoles:{
    independentFirstPass:ALLOWED_MODELS,adversarialCritic:CRITIC_MODEL,
    distinctModelFamilies:1,warning:"Same family; independent prompts are NOT independent scientific evidence"},
   budget:{maximumLocalCalls:plan.maxLocalCalls,observedLocalCalls:count,
    paidModelCalls:0,cloudModelCalls:0,automaticRechecks:rechecks.length,
    maximumExternalMetadataReads:plan.items.length*5,
    observedExternalMetadataReads:externalRegistryCalls},
   primaryMetadata:primary,relatedSourceDiscovery:followUpSources,
   findings:outcome,criticResponses:critiques,
   criticCallLog:critiqueCallLog,rechecks,modelReports:panel.privateReports,
   noAutomaticScientificPublication:true};
  const file=join(DIR,new Date().toISOString().replace(/[:.]/g,"-")+".json");
  await writeFile(file,JSON.stringify(artifact,null,2)+"\n",{mode:0o600,flag:"wx"});
  console.log(JSON.stringify({status:"private_autonomous_cycle_executed",
   classification:outcome.classification,sourceDigestSha256:plan.sourceDigestSha256,
   localModelCalls:count,maximumLocalCalls:plan.maxLocalCalls,
   paidCalls:0,cloudCalls:0,automaticRechecks:rechecks.length,
   verifiedBibliographicIdentities:primary.verifiedRecordCount,
   verifiedOriginalStudyResults:0,registryReadOnlyCalls:externalRegistryCalls,
   candidateRelatedPublications:followUpSources.reduce((n,r)=>n+r.discovery.candidates?.length||0,0),
   distinctModelFamilies:1,
   sourceItems:outcome.outcomes.map(x=>({id:x.itemId,
    status:x.status,priority:x.nextAction,
    criticVerdict:x.critic.verdict,
    coarseAgreement:x.coarseAgreement,
    publisherSourceResultVerified:false})),
   privateArtifact:file,independentScientificValidation:false,
   publicationAuthorised:false},null,2));
 }finally{await rmdir(lock)}
}
async function main(){
 const action=args[0]??"help";
 if(action==="plan"){
  const data=JSON.parse(await readFile(DATASET_PATH,"utf8"));
  const plan=planAutonomousCycle({dataset:data,itemIds:selectedIds()});
  console.log(JSON.stringify({schema:plan.schema,task:plan.task,
   caseIds:plan.items.map(x=>x.id),sourceDigestSha256:plan.sourceDigestSha256,
   roles:{firstPass:ALLOWED_MODELS,critic:CRITIC_MODEL},
   maxLocalCalls:plan.maxLocalCalls,
   maxCloudCalls:0,maxPaidCalls:0,
   requiresHumanSignoffToResearch:false,
   independentScienceCertified:false,
   publicationAuthorised:false,
   nextAction:"Run with --allow-local-inference; claims will remain private and unverified"},null,2));
  return;
 }
 if(action==="run")return run();
 throw Error("Usage: npm run ai:science:auto -- plan | run --allow-local-inference [--item-ids claim:E08,claim:E13]");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 await main().catch(e=>{console.error("HPI autonomous science refused:",e.message);process.exitCode=2});
