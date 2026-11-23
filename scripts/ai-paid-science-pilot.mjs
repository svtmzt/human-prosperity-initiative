/**
 * User-approved paid HPI scientific research pilot, never public inference.
 * Only exact models/providers, current ZDR endpoints, deny collection, no
 * fallback, MAX $0.25 reserved worst-case, <=2 precommitted public cases.
 *
 * Run with an HPI-scoped key already available in process.env:
 * node scripts/ai-paid-science-pilot.mjs run --allow-paid --max-usd 0.25
 */
import {readFile,mkdir,writeFile,readdir,rmdir} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {createHash} from "node:crypto";
import {runResearchTask} from "../research-tools/ai-assist/assistant.mjs";
import {reconcileScientificPanel} from "../research-tools/ai-assist/scientific-validation.mjs";
import {readAiConfig} from "../research-tools/ai-assist/config.mjs";
import {buildProvider} from "../research-tools/ai-assist/runtime.mjs";
import {loadVerifiedPlatform} from "./platform-verify.mjs";
import {
 API,PAID_SCIENCE_MODELS,MAX_PILOT_USD,verifyPaidZdrEndpoint,
 worstCaseReserveUsd,strictPaidRequest,verifyAccountBudget
} from "../research-tools/ai-assist/paid-pilot-safety.mjs";
const KEY=()=>process.env.OPENROUTER_API_KEY||process.env.HPI_AI_API_KEY;
const TARGETS=["claim:E08","claim:E13"];
const TIERS={baseline:["deepseek/deepseek-v4.1-flash-1017",
 "qwen/qwen3.8-27b","anthropic/claude-sonnet-5.5"],
 advanced:["openai/gpt-6.2-sol","anthropic/claude-opus-5.5"]};
const tierIndex=process.argv.indexOf("--tier");
const selectedTier=tierIndex<0?"baseline":process.argv[tierIndex+1];
const MODELS=TIERS[selectedTier];
const OUTPUT_TOKENS=1200;
const researchConfig={maxRequests:2,maxInputChars:6500,maxOutputTokens:OUTPUT_TOKENS};
const privateDir="qa-artifacts/ai-paid-science-pilot";
const jGet=async(path,authenticated=false)=>{
 const r=await fetch(API+path,{method:"GET",redirect:"error",
  headers:{accept:"application/json",...(authenticated?{Authorization:"Bearer "+KEY()}:{})},
  signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error("Paid science metadata check refused HTTP "+r.status);
 return r.json();
};
const ePath=id=>{
 const p=id.split("/");
 return "/models/"+p.map(encodeURIComponent).join("/")+"/endpoints";
};
async function preflight(){
 const [c,z,key,credits]=await Promise.all([
  jGet("/models"),jGet("/endpoints/zdr"),jGet("/key",true),jGet("/credits",true)
 ]);
 const account=verifyAccountBudget(key,credits);
 const routes=[];
 for(const modelId of MODELS){
  const model=c.data?.find(m=>m.id===modelId);
  const providerName=PAID_SCIENCE_MODELS[modelId];
  const endpoints=await jGet(ePath(modelId));
  routes.push(verifyPaidZdrEndpoint({modelId,model,registry:z,
   endpoints,providerName}));
 }
 return {routes,account,checkedAt:new Date().toISOString()};
}
function paidProvider(route,budget){
 return {id:"openrouter_paid_science_only",kind:"openrouter_paid_science",
  model:route.modelId,boundary:"approved_remote", // Paid route is never disguised as free cloud.
  available:true,
  async complete(messages,{maxTokens=OUTPUT_TOKENS}={}){
   const reserve=worstCaseReserveUsd(messages,maxTokens,route);
   if(budget.reserved+reserve>budget.cap+1e-9)
    return {ok:false,status:"pilot_budget_exceeded",scope:"account",reason:"Hard pilot budget exhausted"};
   budget.reserved+=reserve;
   budget.calls++;
   const payload=strictPaidRequest({route,messages,maxTokens});
   let response,body;
   try{
    response=await fetch(API+"/chat/completions",{
     method:"POST",redirect:"error",headers:{"Content-Type":"application/json",
      Authorization:"Bearer "+KEY(),"HTTP-Referer":"https://human-prosperity-initiative.vercel.app",
      "X-Title":"HPI private scientific pilot"},
     body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)});
    body=await response.json();
   }catch(error){
    return {ok:false,status:"upstream_or_timeout",scope:"request",
     reason:"Request failed or timed out; no retry",
     attempts:[{status:"failed"}]};
   }
   if(!response.ok)return {ok:false,status:"http_"+response.status,
    scope:[401,402,403].includes(response.status)?"account":"request",
    reason:"OpenRouter request refused HTTP "+response.status,
    attempts:[{status:"refused",httpStatus:response.status}]};
   const served=body.model;
   // An alias redirect is never counted as valid exact model evidence.
   if(served!==route.modelId)return {ok:false,status:"served_model_mismatch",
    reason:"Unexpected upstream model identity; response quarantined",
    attempts:[{status:"identity_mismatch"}]};
   const content=body?.choices?.[0]?.message?.content;
   if(typeof content!=="string"||!content.trim())return {
    ok:false,status:"empty_or_invalid_content",reason:"Model returned no text",
    attempts:[{status:"invalid_content"}]};
   const usage=body.usage??{};
   return {ok:true,status:"completed",content,model:served,
    requestedModel:route.modelId,providerName:route.providerName,
    structuredMode:"prompt_only",costVerification:"upper_bound_reserved_at_model_endpoint",
    usage:{promptTokens:usage.prompt_tokens||0,
     completionTokens:usage.completion_tokens||0,
     reasoningTokens:usage.completion_tokens_details?.reasoning_tokens||0,
     ...(Number.isFinite(usage.cost)?{costUsd:usage.cost}:{})},
    attempts:[{status:"completed"}]};
  }};
}
async function main(){
 if(process.argv[2]!=="run"||!process.argv.includes("--allow-paid")||
   !process.argv.includes("--max-usd")||
   Number(process.argv[process.argv.indexOf("--max-usd")+1])!==MAX_PILOT_USD)
  throw new Error("Explicit run --allow-paid --max-usd 0.25 required");
 if(!KEY()?.startsWith("sk-or-v1-"))throw new Error("HPI-scoped OpenRouter key absent");
 if(!MODELS||MODELS.some(m=>!PAID_SCIENCE_MODELS[m]))
  throw new Error("Unknown paid pilot tier; use baseline or advanced");
 await mkdir(privateDir,{recursive:true,mode:0o700});
 const exclusiveLock=privateDir+"/.single-flight";
 await mkdir(exclusiveLock,{mode:0o700}); // atomic: prevent concurrent budget-ledger races
 try{
 const source=JSON.parse(await readFile("research/ai/evaluation-set-v1.json","utf8"));
 const items=TARGETS.map(id=>source.items.find(x=>x.id===id));
 if(items.some(x=>!x||x.task!=="claim-extraction"||
  x.sources.some(s=>s.dataClass!=="public_research_metadata")))
  throw new Error("Fixed public versioned source set changed; refuse");
 const sourceDigest=createHash("sha256").update(JSON.stringify(items)).digest("hex");
 const pre=await preflight();
 const {kb}=await loadVerifiedPlatform();
 const vocab={mechanismIds:[...kb.mechanisms.keys()],endpointLevels:kb.parsed.claims.endpointLevels};
 let previousReserved=0;
 try{for(const name of await readdir(privateDir)){
  if(!name.endsWith(".json"))continue;
  const x=JSON.parse(await readFile(privateDir+"/"+name,"utf8"));
  const value=x?.spend?.worstCaseReservedUsd;
  if(typeof value!=="number"||!Number.isFinite(value)||value<0)
   throw new Error("Unverifiable prior pilot ledger");
  previousReserved+=value;
 }}catch(e){if(e?.code!=="ENOENT")throw e;}
 if(previousReserved>=MAX_PILOT_USD)throw new Error("Cumulative pilot limit exhausted");
 const budget={cap:MAX_PILOT_USD-previousReserved,reserved:0,calls:0};
 const reports=[];
 const localCfg=readAiConfig({HPI_AI_PROVIDER:"local",HPI_AI_MODEL:"qwen3.5:4b-q4_K_M"});
 const local=await buildProvider(localCfg,{task:"claim-extraction",env:{}});
 if(!local.provider.available)throw new Error("Native local control unavailable");
 const all=[{id:"qwen3.5:4b-q4_K_M",family:"qwen",provider:local.provider,
  config:{...localCfg,...researchConfig}},
  ...pre.routes.map(route=>({id:route.modelId,family:route.modelId.split("/")[0],
   provider:paidProvider(route,budget),config:researchConfig}))];
 for(const m of all){
  const report=await runResearchTask({task:"claim-extraction",items,
   provider:m.provider,config:m.config,vocab});
  reports.push({model:m.id,family:m.family,report});
 }
 const decision=reconcileScientificPanel({task:"claim-extraction",items,reports});
 const artifact={classification:"PRIVATE_PENDING_HUMAN_REVIEW",
  published:false,scientificEvidenceValidated:false,
  exactProviderPolicy:"zdr + data_collection deny; no fallback",
  runAt:new Date().toISOString(),selectedTier,sourceDigest,sourceIds:TARGETS,
  preflight:{at:pre.checkedAt,routes:pre.routes,
   accountHadKeyHardCap:pre.account.keyHardLimitPresent},
  spend:{pilotCapUsd:MAX_PILOT_USD,previousReservedUsd:previousReserved,
   cumulativeReservedUsd:previousReserved+budget.reserved,worstCaseReservedUsd:budget.reserved,
   modelCallsAttempted:budget.calls},
  decision,reports};
 await mkdir(privateDir,{recursive:true,mode:0o700});
 const file=privateDir+"/"+new Date().toISOString().replace(/[:.]/g,"-")+".json";
 await writeFile(file,JSON.stringify(artifact,null,2)+"\n",{mode:0o600,flag:"wx"});
 console.log(JSON.stringify({privateReviewFile:file,publications:0,items:TARGETS.length,
  models:reports.map(r=>({id:r.model,status:r.report.status,
   requests:r.report.totals.requests,accepted:r.report.results.reduce((n,x)=>n+(x.accepted||0),0),
   rejected:r.report.results.reduce((n,x)=>n+(x.rejected||0),0),
   failures:r.report.failures.map(f=>f.status)})),
  agreementsNotScience:decision.fullyConsistent,unresolved:decision.unresolved,
  selectedTier,pilotCapUsd:MAX_PILOT_USD,previousReservedUsd:previousReserved,
  cumulativeReservedUsd:previousReserved+budget.reserved,worstCaseReservedUsd:budget.reserved,
  externalPaidCalls:budget.calls,independentHumanReviewCompleted:false},null,2));
 }finally{await rmdir(exclusiveLock)}
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{console.error("Private paid pilot refused:",e.message);process.exitCode=2});
}
