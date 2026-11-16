/**
 * HPI AI research-assistance CLI (internal research mode).
 *
 *   npm run ai:status                          provider state (no network)
 *   npm run ai:discover [-- --refresh]         OpenRouter free-model catalogue (metadata only, no inference quota)
 *   npm run ai:local                           discover models on a loopback runtime (Ollama, LM Studio, llama.cpp, LiteLLM)
 *   npm run ai:quota                           OpenRouter key quota/spend status and local daily ledger
 *   npm run ai:baseline                        deterministic non-AI source profiles
 *   npm run ai:extract -- --ids E08,E13        claim extraction for HUMAN REVIEW
 *   npm run ai:run -- <task> --ids E08         any task: claim-extraction | source-classification | mechanism-tagging
 *                                              | evidence-gap-detection (--contexts UK-NEWHAM) | contradiction-detection (--pairs E29:E30)
 *   npm run ai:eval:set [-- --check]           write or drift-check research/ai/evaluation-set-v1.json
 *   npm run ai:evaluate -- --models a:free,b:free [--tasks ...] [--publish]
 *   npm run ai:review -- list | decide --id AIQ-... --decision reject --reviewer "Name"
 *
 * Configuration: docs/platform/ai-research-assistance-v2.md. Outputs go to
 * qa-artifacts/ (git-ignored) and are never published, except --publish on
 * evaluate, which writes AGGREGATE metrics only.
 */
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {readAiConfig,describeAiConfig,readApiKey,OPENROUTER_DATA_POLICIES} from "../research-tools/ai-assist/config.mjs";
import {runClaimExtraction,runResearchTask,deterministicSourceProfile} from "../research-tools/ai-assist/assistant.mjs";
import {promptFingerprint,TASK_IDS} from "../research-tools/ai-assist/safeguards.mjs";
import {describeRoutingPolicy} from "../research-tools/ai-assist/policy.mjs";
import {catalogSnapshot} from "../research-tools/ai-assist/catalog.mjs";
import {discoverLocalModels} from "../research-tools/ai-assist/providers.mjs";
import {fetchKeyStatus,FileQuotaStore} from "../research-tools/ai-assist/quota.mjs";
import {buildProvider,loadOpenRouterCatalog,loadSelectionPolicy,PATHS} from "../research-tools/ai-assist/runtime.mjs";
import {ledgerSources,contextDossier} from "../research-tools/ai-assist/corpus.mjs";
import {buildEvaluationSet,scoreEvaluation,consistencyBetweenRuns} from "../research-tools/ai-assist/evaluation.mjs";
import {writeReviewQueue,listQueue,recordDecision} from "../research-tools/ai-assist/review-queue.mjs";
import {GATEWAY_PREREQUISITES} from "../research-tools/ai-assist/gateway.mjs";
import {loadVerifiedPlatform} from "./platform-verify.mjs";

export const EVAL_SET_PATH="research/ai/evaluation-set-v1.json";
export const EVAL_RESULTS_PATH="research/ai/evaluation-results-v1.json";
// Evaluation tolerates congested shared free pools with slow, bounded retries (max 2 per item, 20s then 40s).
const EVAL_PROVIDER_OPTIONS={upstreamRetries:2,upstreamWaitMs:20000,modelFailureThreshold:6};

export async function evidenceSourceTexts(load=p=>readFile(p,"utf8")){
 return ledgerSources({ledgerCsv:await load("research/evidence-ledger.csv"),structuredCsv:await load("research/F0-02-structured-evidence-2026-11-06.csv")});
}

/**
 * Secret-free AI status published at /platform-ai-status.json. The static
 * website never calls a model; `productionInference` is therefore always false.
 */
export function buildAiStatus(config,{snapshot=null,policy=null,evaluation=null}={}){
 const evalSummary=evaluation?{evaluatedAt:evaluation.evaluatedAt,setVersion:evaluation.evaluationSet?.version,
  models:evaluation.models.map(m=>({model:m.model,status:m.status}))}:null;
 return {schemaVersion:"2.0",kind:"hpi_ai_research_assistance_status",
  productionInference:false,websiteCallsModels:false,publicHostedInference:"disabled",
  buildEnvironmentProvider:describeAiConfig(config),
  configuration:describeAiConfig(config),
  publishedAiGeneratedContent:0,
  statement:"The public website performs no AI inference and publishes no AI-generated analysis. Internal research mode (CLI) supports a local loopback runtime and verified free OpenRouter models; its output is a private human-review queue. Deterministic, rule-based checks are published and labelled as non-AI.",
  modes:[
   {id:"internal_local",label:"Internal research — local model",status:"implemented; live test blocked (no local runtime reachable from the build/test environment)",boundary:"local"},
   {id:"internal_free_cloud",label:"Internal research — verified free OpenRouter models",status:evaluation?"implemented; live evaluation recorded":"implemented",boundary:"free_cloud"},
   {id:"public_limited_cloud",label:"Limited public cloud assistance",status:"implemented as a disabled gateway library; not deployed",boundary:"free_cloud",prerequisites:GATEWAY_PREREQUISITES.map(p=>p.description)},
   {id:"institutional",label:"Institutional or sponsored capacity",status:"interface only (organisational gateway via openai_compatible); nothing provisioned",boundary:"approved_remote"}
  ],
  freeModelPolicy:{dataPolicyDefault:"deny_collection",dataPolicies:OPENROUTER_DATA_POLICIES,paidFallback:"none",router:policy?.router??null,
   selectionPolicyStatus:policy?.status??null,excludedModels:(policy?.excluded||[]).map(x=>({id:x.id,reason:x.reason}))},
  catalogueSnapshot:snapshot?{fetchedAt:snapshot.fetchedAt,counts:snapshot.counts,freeTextModels:snapshot.freeTextModels.length,zdrListChecked:snapshot.zdrListChecked}:null,
  evaluation:evalSummary,
  dataRouting:describeRoutingPolicy(),
  promptTemplates:TASK_IDS.map(promptFingerprint),
  safeguards:["Source text is treated as untrusted data and delimited","Prompt-injection screening quarantines suspicious sources before any request",
   "Data classification and personal-data screening before any request; only public research metadata may reach free cloud models",
   "Free cloud requests carry provider.max_price=0, data_collection=deny, no fallback-models array and no paid route",
   "Pricing verified from a fresh catalogue (≤24h) and per-endpoint metadata; stale or ambiguous pricing fails closed",
   "Served model and reported cost verified on every response; any non-zero cost or unexpected model stops the run",
   "Circuit breaker on authentication, credit, quota or budget errors; bounded retries with backoff; client-side pacing",
   "Schema-constrained JSON output validation (native structured output where supported, strict parsing otherwise)",
   "Verbatim quote check against the cited source; every number in a claim must appear in the source",
   "Abstention accepted; unsupported claims rejected","Recommendation, eligibility and certainty language rejected",
   "Request, input, output-token, per-run attempt and daily ceilings","Known paid hosts refused on the generic adapter without a recorded approval reference",
   "Outputs labelled ai_generated_hypothesis and pending_human_review","Review queue written only to git-ignored local artifacts; no automatic promotion"],
  prohibitedUses:["Certifying research validity","Approving interventions","Decisions about individuals","Publishing model output as evidence","Processing beneficiary or case records"]};
}

const arg=(rest,name)=>{const i=rest.indexOf(name);return i>=0?rest[i+1]:null};
const csvArg=(rest,name)=>String(arg(rest,name)||"").split(",").map(s=>s.trim()).filter(Boolean);
async function vocabulary(kb){return {mechanismIds:[...kb.mechanisms.keys()],endpointLevels:kb.parsed.claims.endpointLevels}}

async function itemsFor(task,rest,kb,sources){
 if(task==="evidence-gap-detection"){
  const ctxs=csvArg(rest,"--contexts");
  const map={"UK-NEWHAM":"PROG-UK-PENSION-CREDIT","BR-RECIFE":"PROG-BR-CADUNICO-BOLSA-FAMILIA","IT-NAPLES":"PROG-IT-ADI"};
  return (ctxs.length?ctxs:Object.keys(map)).map(c=>{const d=contextDossier(kb,c,map[c]);return {id:"gaps:"+c,contextId:c,contextName:d.contextName,sources:[d]}});
 }
 if(task==="contradiction-detection"){
  const byId=new Map(sources.map(s=>[s.id,s]));
  return csvArg(rest,"--pairs").map(p=>{const [a,b]=p.split(":");if(!byId.has(a)||!byId.has(b))throw new Error("Unknown pair "+p);return {id:"pair:"+a+"-"+b,sources:[byId.get(a),byId.get(b)]}});
 }
 const ids=csvArg(rest,"--ids");
 return (ids.length?sources.filter(s=>ids.includes(s.id)):sources).map(s=>({id:s.id,sources:[s]}));
}

async function evaluate(rest,config){
 if(config.kind!=="openrouter"&&config.kind!=="local"&&config.kind!=="openai_compatible")throw new Error("Configure a provider first (HPI_AI_PROVIDER).");
 const set=JSON.parse(await readFile(EVAL_SET_PATH,"utf8"));
 const {kb}=await loadVerifiedPlatform();
 const vocab=await vocabulary(kb);
 const tasks=csvArg(rest,"--tasks").length?csvArg(rest,"--tasks"):TASK_IDS;
 const models=config.kind==="openrouter"?csvArg(rest,"--models"):[config.model||"local-default"];
 if(!models.length)throw new Error("Pass --models with one or more ':free' model ids to compare.");
 const stamp=new Date().toISOString().replace(/[:.]/g,"-");
 const keyBefore=config.kind==="openrouter"?await fetchKeyStatus({apiKey:readApiKey(config,process.env)}):null;
 const out=[];
 let accountStop=null;
 for(const model of models){
  const runConfig={...config,model:config.kind==="openrouter"?model:config.model,fallbackModels:[],maxRequests:500};
  const results=new Map(),reports=[];
  let stop=null;
  for(const task of tasks){
   const items=set.items.filter(i=>i.task===task);
   if(!items.length)continue;
   if(accountStop||stop){for(const i of items)results.set(i.id,{status:"not_run",reason:accountStop||stop});continue}
   const built=await buildProvider(runConfig,{task,models:config.kind==="openrouter"?[model]:null,allowFallback:false,providerOptions:EVAL_PROVIDER_OPTIONS});
   if(!built.provider.available){for(const i of items)results.set(i.id,{status:"provider_unavailable_before_request",reason:built.provider.reason||(await built.provider.complete()).reason});stop="provider unavailable: "+((await built.provider.complete()).reason);continue}
   console.error("·",model,task,items.length,"items");
   const report=await runResearchTask({task,items,provider:built.provider,config:runConfig,vocab,
    onProgress:r=>console.error("  ",r.itemId,r.status,r.latencyMs+"ms",r.servedModel||"")});
   reports.push({task,status:report.status,breaker:report.breaker,totals:report.totals,endpointChecks:built.endpointChecks,catalog:built.catalogInfo});
   for(const r of report.results)results.set(r.itemId,r);
   for(const q of report.quarantined)results.set(q.itemId,{quarantined:true,status:"quarantined"});
   for(const b of report.blocked)results.set(b.itemId,{blocked:true,status:"blocked"});
   const unavailable=new Set(["rate_limited_upstream","model_circuit_open","no_compliant_endpoint","model_not_found","model_gated"]);
   if(report.results.length&&report.results.every(r=>unavailable.has(r.status)))stop="model unavailable for this account and data policy ("+report.results[0].status+")";
   if(report.breaker?.state==="open"){stop=report.breaker.status+": "+report.breaker.reason;if(["quota_exhausted","auth_error","payment_required","budget_or_guardrail_block","cost_violation","daily_ceiling_reached"].includes(report.breaker.status))accountStop=stop}
  }
  // repeat a small subset to measure run-to-run consistency
  const repeats=[];
  if(!stop&&!accountStop&&tasks.includes("claim-extraction")&&!rest.includes("--no-repeat")){
   const items=set.items.filter(i=>set.repeatItems.includes(i.id)).map(i=>({...i,id:i.id+"#repeat"}));
   const built=await buildProvider(runConfig,{task:"claim-extraction",models:config.kind==="openrouter"?[model]:null,allowFallback:false,providerOptions:EVAL_PROVIDER_OPTIONS});
   if(built.provider.available){
    const report=await runResearchTask({task:"claim-extraction",items,provider:built.provider,config:runConfig,vocab});
    for(const r of report.results)repeats.push({itemId:r.itemId.replace("#repeat",""),agreement:consistencyBetweenRuns(results.get(r.itemId.replace("#repeat","")),r),status:r.status});
   }
  }
  const score=scoreEvaluation(set.items.filter(i=>tasks.includes(i.task)),results);
  const answered=repeats.filter(r=>!["not_run"].includes(r.status));
  out.push({model,status:stop?"stopped: "+stop:"completed",score,repeats:{items:repeats.length,meanAgreement:answered.length?Math.round(answered.reduce((n,r)=>n+r.agreement,0)/answered.length*1000)/1000:null},
   reports,raw:Object.fromEntries(results)});
 }
 const keyAfter=config.kind==="openrouter"?await fetchKeyStatus({apiKey:readApiKey(config,process.env)}):null;
 const dir="qa-artifacts/ai-evaluation/"+stamp;
 await mkdir(dir,{recursive:true});
 await writeFile(dir+"/raw-private.json",JSON.stringify({note:"PRIVATE: unreviewed model output. Never publish.",set:{version:set.version,sha256:set.sha256},out},null,2)+"\n");
 const aggregate={schemaVersion:"1.0",kind:"hpi_ai_evaluation_results",evaluatedAt:new Date().toISOString(),
  evaluationSet:{path:EVAL_SET_PATH,version:set.version,sha256:set.sha256,items:set.items.length},
  providerKind:config.kind,dataPolicy:config.dataPolicy??null,
  prompts:TASK_IDS.map(promptFingerprint),
  parameters:{temperature:0,maxOutputTokens:config.maxOutputTokens,maxRetries:config.maxRetries,minIntervalMs:config.minIntervalMs,fallback:"disabled during evaluation (each model measured alone)"},
  referenceStatement:"Reference judgements are HPI internal curation committed before this evaluation; they are not independent expert review (G-05 open). Metrics are automated agreement proxies.",
  spend:keyBefore?.ok&&keyAfter?.ok?{usageUsdBefore:keyBefore.usageUsdTotal,usageUsdAfter:keyAfter.usageUsdTotal,
   freeRequestsUsedBefore:keyBefore.freeModelDailyRequests?.used??null,freeRequestsUsedAfter:keyAfter.freeModelDailyRequests?.used??null}:null,
  models:out.map(m=>({model:m.model,status:m.status,metrics:m.score.metrics,operations:m.score.operations,consistency:m.repeats,
   servedModels:[...new Set(Object.values(m.raw).map(r=>r.servedModel).filter(Boolean))],upstreamProviders:[...new Set(Object.values(m.raw).map(r=>r.upstreamProvider).filter(Boolean))],
   endpointChecks:m.reports.map(r=>r.endpointChecks).find(Boolean)||null}))};
 await writeFile(dir+"/aggregate.json",JSON.stringify(aggregate,null,2)+"\n");
 if(rest.includes("--publish"))await writeFile(EVAL_RESULTS_PATH,JSON.stringify(aggregate,null,2)+"\n");
 console.log(JSON.stringify(aggregate.models.map(m=>({model:m.model,status:m.status,metrics:m.metrics,ops:{requests:m.operations.requests,attempts:m.operations.attempts,failures:m.operations.providerFailures,p50:m.operations.latencyMsMedian}})),null,1));
 console.log("Private raw output:",dir+"/raw-private.json",rest.includes("--publish")?"| published aggregate: "+EVAL_RESULTS_PATH:"");
}

async function main(){
 const [command="status",...rest]=process.argv.slice(2);
 const config=readAiConfig(process.env);
 if(command==="status"){console.log(JSON.stringify(buildAiStatus(config),null,2));return}
 if(command==="discover"){
  const cfg=config.kind==="openrouter"?config:{...config,catalogMaxAgeHours:24};
  const r=await loadOpenRouterCatalog({config:cfg,refresh:rest.includes("--refresh")});
  if(!r.catalog){console.error("Catalogue unavailable:",r.refreshError);process.exitCode=2;return}
  const snap=catalogSnapshot(r.catalog);
  if(rest.includes("--write-snapshot"))await writeFile(PATHS.snapshot,JSON.stringify(snap,null,2)+"\n");
  console.log(JSON.stringify({origin:r.origin,fresh:r.freshness.fresh,reason:r.freshness.reason,...snap},null,2));return;
 }
 if(command==="local"){const r=await discoverLocalModels(config);console.log(JSON.stringify(r,null,2));if(!r.ok)process.exitCode=2;return}
 if(command==="quota"){
  const ledger=await new FileQuotaStore(PATHS.quotaLedger).get("openrouter-attempts:"+new Date().toISOString().slice(0,10));
  const key=config.kind==="openrouter"?await fetchKeyStatus({apiKey:readApiKey(config,process.env)}):{ok:false,reason:"Not an OpenRouter configuration"};
  console.log(JSON.stringify({localDailyLedger:{used:ledger,ceiling:config.dailyRequestCeiling},openrouterKey:key},null,2));return;
 }
 if(command==="eval:set"){
  const {kb}=await loadVerifiedPlatform();
  const text=JSON.stringify(buildEvaluationSet(kb,await evidenceSourceTexts()),null,2)+"\n";
  if(rest.includes("--check")){const cur=await readFile(EVAL_SET_PATH,"utf8").catch(()=>"");if(cur!==text){console.error("Evaluation set is stale; run npm run ai:eval:set");process.exitCode=1}else console.log("Evaluation set current.");return}
  await mkdir("research/ai",{recursive:true});await writeFile(EVAL_SET_PATH,text);console.log("Wrote",EVAL_SET_PATH);return;
 }
 if(command==="evaluate"){await evaluate(rest,config);return}
 if(command==="review"){
  if(rest[0]==="decide"){console.log(JSON.stringify(await recordDecision({id:arg(rest,"--id"),decision:arg(rest,"--decision"),reviewer:arg(rest,"--reviewer"),note:arg(rest,"--note")||""}),null,2));return}
  const items=await listQueue();
  console.log(JSON.stringify(items.map(i=>({id:i.id,task:i.task,itemId:i.itemId,statement:i.statement??i.design??i.mechanismId??i.relation??i.stage,quote:i.quote??i.quoteA,reviewStatus:i.reviewStatus,model:i.provenance?.servedModel})),null,2));return;
 }
 const {kb}=await loadVerifiedPlatform();
 const sources=await evidenceSourceTexts();
 if(command==="baseline"){
  const profiles=sources.map(s=>deterministicSourceProfile(kb.catalog.get(s.id),s.structured));
  console.log(JSON.stringify({method:"deterministic_rule_based",ai:false,profiles},null,2));return;
 }
 if(command==="extract"||command==="run"){
  const task=command==="extract"?"claim-extraction":rest[0];
  if(!TASK_IDS.includes(task)){console.error("Unknown task. Use one of: "+TASK_IDS.join(", "));process.exitCode=1;return}
  const built=await buildProvider(config,{task});
  for(const n of built.notes||[])console.error(n);
  const vocab=await vocabulary(kb);
  const report=task==="claim-extraction"&&command==="extract"&&config.kind!=="openrouter"&&config.kind!=="local"
   ?await runClaimExtraction({sources:(await itemsFor(task,rest,kb,sources)).map(i=>i.sources[0]),provider:built.provider,config,knownMechanismIds:vocab.mechanismIds,endpointLevels:vocab.endpointLevels})
   :await runResearchTask({task,items:await itemsFor(task,rest,kb,sources),provider:built.provider,config,vocab});
  const file=await writeReviewQueue(report);
  console.log("AI",task,"status:",report.status,"| queued for human review:",report.queue.length,"| quarantined:",report.quarantined.length,"| blocked:",report.blocked?.length||0,"| failures:",report.failures.length,"→",file);
  for(const f of report.failures.slice(0,5))console.error("  failure",f.itemId??f.sourceId,f.status,"-",f.reason);
  if(!["completed_pending_human_review","partial_pending_human_review"].includes(report.status))process.exitCode=2;
  return;
 }
 console.error("Unknown command. Use status | discover | local | quota | baseline | extract | run | eval:set | evaluate | review");process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
