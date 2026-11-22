/**
 * HPI research-only scientific panel CLI. Explicit execution opt-in; default is
 * offline assessment; never paid, never public inference or automatic release.
 *
 * npm run ai:science -- plan
 * npm run ai:science -- costs                (public GET only; no key or billing)
 * HPI_AI_PROVIDER=local npm run ai:science -- run --task claim-extraction \
 *   --item-ids claim:E08,claim:E13 --models qwen3.5:4b-q4_K_M,qwen3.5:9b --allow-inference
 * HPI_AI_PROVIDER=openrouter OPENROUTER_API_KEY=... npm run ai:science -- run \
 *   --task claim-extraction --item-ids claim:E08,claim:E13 \
 *   --models baidu/ernie-5.5-flash-preview:free,inclusionai/ling-3.2-flash:free --allow-inference
 */
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {readAiConfig} from "../research-tools/ai-assist/config.mjs";
import {buildProvider} from "../research-tools/ai-assist/runtime.mjs";
import {loadVerifiedPlatform} from "./platform-verify.mjs";
import {assessModelReadiness,runScientificPanel} from "../research-tools/ai-assist/scientific-validation.mjs";
import {buildCostLadder,planAccuracyFirstEscalation} from "../research-tools/ai-assist/model-costs.mjs";
import {buildSyntheticChallenges,inspectChallengeSafety} from "../research-tools/ai-assist/scientific-challenges.mjs";

const field=(rest,name)=>{const idx=rest.indexOf(name);return idx<0?null:rest[idx+1]};
const fields=(rest,name)=>String(field(rest,name)||"").split(",").map(x=>x.trim()).filter(Boolean);
const BENCHMARK_PATH="research/ai/local-ollama-comparison-2026-11-22.json";
const DATASET_PATH="research/ai/evaluation-set-v1.json";
const root="qa-artifacts/ai-scientific-panel";
const privateFile=async(path,data)=>{await mkdir(root,{recursive:true});await writeFile(path,JSON.stringify(data,null,2)+"\n",{mode:0o600,flag:"wx"})};

export function planningFromExistingBenchmarks(comparison){
 if(comparison?.heldOutReference?.items!==46||comparison?.runs?.length!==2)
  throw new Error("Unrecognised historical local comparison; cannot plan from missing evidence");
 const assessments=comparison.runs.flatMap(run=>Object.entries(run.metrics).map(([task,metrics])=>
  assessModelReadiness({model:run.model,task,metrics,
   independentReference:false,independentlyAdjudicatedItems:0,
   criticalSafetyFindings:run.model==="qwen3.5:9b"?1:0})));
 return {kind:"hpi_ai_evidence_first_plan",source:BENCHMARK_PATH,
  referenceVersion:comparison.heldOutReference.version,
  observations:assessments.map(a=>({
   model:a.model,task:a.task,qualified:a.qualifiedForConsideration,
   reasons:a.reasons,internalReferenceOnly:true
  })),next:planAccuracyFirstEscalation({candidateAssessments:assessments})};
}

export async function makePublicCostPlan({fetchImpl=globalThis.fetch,now=()=>new Date()}={}){
 const url="https://openrouter.ai/api/v1/models";
 const response=await fetchImpl(url,{method:"GET",headers:{"Accept":"application/json","User-Agent":"HPI-science-cost-planner/1.0"},redirect:"error"});
 if(!response.ok)throw new Error("Read-only model catalogue unavailable (HTTP "+response.status+")");
 const data=await response.json();
 if(!Array.isArray(data?.data))throw new Error("Unrecognised public model catalogue");
 return buildCostLadder(data.data,{fetchedAt:now().toISOString()});
}

/** Explicit mixed-route specs (local::model or openrouter::model:free).
 * No paid provider type is accepted. Bare IDs inherit the configured default.
 */
export function parsePanelModelSpec(raw,defaultProvider){
 const parts=String(raw||"").split("::");
 if(parts.length>2||!parts[parts.length-1])throw new Error("Invalid model specification");
 const kind=parts.length===2?parts[0]:defaultProvider;
 const id=parts.length===2?parts[1]:parts[0];
 if(!["local","openrouter"].includes(kind))
  throw new Error("Only local or verified-free OpenRouter science routes are supported");
 if(!/^[A-Za-z0-9._:@/-]{1,160}$/.test(id))
  throw new Error("Invalid model identifier");
 if(kind==="openrouter"&&!id.endsWith(":free"))
  throw new Error("Paid models may be priced but cannot be called in a research panel");
 return {kind,id,family:id.includes("qwen")?"qwen":id.split("/")[0]};
}
export async function runPanelWithProvider({task,itemIds,modelIds,config,load=readFile,env=process.env}){
 if(!config||!["local","openrouter","disabled"].includes(config.kind))
  throw new Error("Private panel requires a local or verified-free OpenRouter configuration");
 if(!Array.isArray(itemIds)||!itemIds.length||itemIds.length>15||new Set(itemIds).size!==itemIds.length)
  throw new Error("Use 1-15 distinct versioned evaluation item IDs");
 if(!Array.isArray(modelIds)||modelIds.length<2||modelIds.length>3||
  new Set(modelIds).size!==modelIds.length)
  throw new Error("Use 2-3 distinct, explicitly selected models");
 const data=JSON.parse(await load(DATASET_PATH,"utf8"));
 const items=data.items.filter(x=>itemIds.includes(x.id));
 if(items.length!==itemIds.length||items.some(x=>x.task!==task))
  throw new Error("Every selected item must be known and belong to the same task");
 const {kb}=await loadVerifiedPlatform();
 const vocab={mechanismIds:[...kb.mechanisms.keys()],endpointLevels:kb.parsed.claims.endpointLevels};
 const specs=modelIds.map(m=>parsePanelModelSpec(m,config.kind));
 if(new Set(specs.map(x=>x.kind+"::"+x.id)).size!==specs.length)
  throw new Error("Duplicate candidate route");
 const candidates=[];
 for(const {kind,id,family} of specs){
  const envForProvider={...env,HPI_AI_PROVIDER:kind,HPI_AI_MODEL:id};
  // Scientific cloud runs default to the stricter current ZDR route, unlike
  // the older free-only descriptive benchmark's deny_collection baseline.
  if(kind==="openrouter"&&!envForProvider.HPI_AI_OPENROUTER_DATA_POLICY)
   envForProvider.HPI_AI_OPENROUTER_DATA_POLICY="zdr";
  const cfg=readAiConfig(envForProvider);
  if(!cfg.available)throw new Error("Research model not configured: "+kind+"::"+id+"; "+cfg.reasonDisabled);
  const conf={...cfg,model:id,fallbackModels:[],maxRequests:15};
  const selected=await buildProvider(conf,{task,env:envForProvider,
   models:kind==="openrouter"?[id]:null,allowFallback:false});
  if(!selected.provider.available)
   throw new Error("Model is not usable within current free/privacy policy: "+id+"; "+selected.provider.reason);
  candidates.push({id,family,config:conf,provider:selected.provider});
 }
 return runScientificPanel({task,items,candidates,vocab});
}

export async function main(argv=process.argv.slice(2)){
 const [action="help",...rest]=argv;
 if(action==="plan"){
  const data=JSON.parse(await readFile(BENCHMARK_PATH,"utf8"));
  console.log(JSON.stringify(planningFromExistingBenchmarks(data),null,2));return;
 }
 if(action==="costs"){
  const result=await makePublicCostPlan();
  console.log(JSON.stringify(result,null,2));return;
 }
 if(action==="challenges"){
  console.log(JSON.stringify(inspectChallengeSafety(buildSyntheticChallenges()),null,2));return;
 }
 if(action==="run"){
  if(!rest.includes("--allow-inference"))throw new Error("Requires --allow-inference; otherwise no model request will be sent");
  const task=field(rest,"--task"),itemIds=fields(rest,"--item-ids"),modelIds=fields(rest,"--models");
  const result=await runPanelWithProvider({task,itemIds,modelIds,config:readAiConfig(process.env),env:process.env});
  const name=new Date().toISOString().replaceAll(":","-").replaceAll(".","-");
  const file=root+"/"+name+"-private.json";
  await privateFile(file,{classification:"PRIVATE_PENDING_HUMAN_REVIEW",reference:DATASET_PATH,
   decision:result.decision,modelReports:result.privateReports});
  console.log(JSON.stringify({task,items:itemIds.length,models:modelIds,
   sourceFamilyCount:result.decision.independentModelFamilies,
   unresolved:result.decision.unresolved,
   privateReviewFile:file,publicationAuthorised:false,
   caution:"Model agreement is not scientific validation. Do not publish these conclusions."},null,2));
  return;
 }
 console.log("Usage: npm run ai:science -- plan | costs | challenges | run --allow-inference --task TASK --item-ids x,y --models model1,model2");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 await main().catch(e=>{console.error("AI science panel refused:",e.message);process.exitCode=2});
