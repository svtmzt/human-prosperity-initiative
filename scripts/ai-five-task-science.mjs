import {readFile,mkdir,stat,writeFile,rmdir} from "node:fs/promises";
import {readAiConfig} from "../research-tools/ai-assist/config.mjs";
import {buildProvider} from "../research-tools/ai-assist/runtime.mjs";
import {loadVerifiedPlatform} from "./platform-verify.mjs";
import {planFiveTasks,runFiveTasks,MODELS} from "../research-tools/ai-assist/multitask-science.mjs";
const args=process.argv.slice(2);
const plan=planFiveTasks(JSON.parse(await readFile("research/ai/evaluation-set-v1.json","utf8")));
if(args.join(" ")==="plan"){
 console.log(JSON.stringify({cases:plan.items.map(x=>({id:x.id,task:x.task})),models:MODELS,selectionSha256:plan.selectionSha256,
 logicalCalls:10,referenceType:plan.referenceType,paidCalls:0},null,2));
}else if(args.join(" ")==="run --allow-local-inference"){
 const dir="qa-artifacts/ai-five-task";
 await mkdir(dir,{recursive:true,mode:0o700});
 if(((await stat(dir)).mode&0o077)!==0)throw Error("Private folder must be 0700");
 const lock=dir+"/.single-flight";await mkdir(lock,{mode:0o700});
 try{
  const {kb}=await loadVerifiedPlatform();
  const vocab={mechanismIds:[...kb.mechanisms.keys()],endpointLevels:kb.parsed.claims.endpointLevels};
  const result=await runFiveTasks({plan,vocab,makeCandidate:async(m,task)=>{
   const cfg=readAiConfig({HPI_AI_PROVIDER:"local",HPI_AI_MODEL:m.id,HPI_AI_LOCAL_RUNTIME:"ollama",
    HPI_AI_LOCAL_API:"native",HPI_AI_BASE_URL:"http://127.0.0.1:11434",HPI_AI_MAX_REQUESTS:"1",
    HPI_AI_MAX_INPUT_CHARS:"12000",HPI_AI_MAX_OUTPUT_TOKENS:"1100",HPI_AI_LOCAL_NUM_CTX:"8192",
    HPI_AI_TIMEOUT_MS:"90000",HPI_AI_MAX_RETRIES:"0"});
   const {provider}=await buildProvider(cfg,{task,env:{}});
   return {...m,config:cfg,provider};
  },onTask:r=>console.error(JSON.stringify(r))});
  const file=dir+"/"+new Date().toISOString().replace(/[:.]/g,"-")+".json";
  await writeFile(file,JSON.stringify(result,null,2)+"\n",{mode:0o600,flag:"wx"});
  const {privatePanels,...summary}=result;
  console.log(JSON.stringify({...summary,privateReport:file},null,2));
 }finally{await rmdir(lock)}
}else throw Error("Usage: plan | run --allow-local-inference");
