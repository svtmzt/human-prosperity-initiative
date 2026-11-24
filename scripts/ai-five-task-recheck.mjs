import {readFile,mkdir,stat,writeFile,rmdir,lstat} from "node:fs/promises";
import {join,basename} from "node:path";
import {homedir} from "node:os";
import {readAiConfig} from "../research-tools/ai-assist/config.mjs";
import {buildProvider} from "../research-tools/ai-assist/runtime.mjs";
import {loadVerifiedPlatform} from "./platform-verify.mjs";
import {planFiveTasks} from "../research-tools/ai-assist/multitask-science.mjs";
import {planMultitaskRecheck,executeMultitaskRecheck,RECHECK_MODEL} from "../research-tools/ai-assist/multitask-recheck.mjs";
const args=process.argv.slice(2);
const [action,flag,name,opt]=args;
if(!["plan","run"].includes(action)||flag!=="--baseline"||typeof name!=="string"||
 basename(name)!==name||!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/.test(name)||
 (action==="run"?(opt!=="--allow-local-inference"||args.length!==4):args.length!==3))
 throw Error("Usage: plan --baseline FILENAME | run --baseline FILENAME --allow-local-inference");
const baselineDir=join(homedir(),"Library/Application Support/HPI/scientific-research/five-task-diagnostic");
const baselinePath=join(baselineDir,name);
const info=await lstat(baselinePath);
if(!info.isFile()||(info.mode&0o077)!==0||info.size>1000000||((await lstat(baselineDir)).mode&0o077)!==0)
 throw Error("Baseline must be a private regular file in the authorised archive");
const baseline=JSON.parse(await readFile(baselinePath,"utf8"));
const plan=planFiveTasks(JSON.parse(await readFile("research/ai/evaluation-set-v1.json","utf8")));
const p=planMultitaskRecheck({plan,baseline});
if(action==="plan")console.log(JSON.stringify({model:RECHECK_MODEL,cases:p.items.filter(x=>x.needsRecheck).map(x=>x.id),maxLogicalInvocations:p.maxLogicalInvocations,baselineSha256:p.baselineSha256,paidCalls:0},null,2));
else{
 const dir="qa-artifacts/ai-five-task-recheck";
 await mkdir(dir,{recursive:true,mode:0o700});
 if(((await stat(dir)).mode&0o077)!==0)throw Error("Private folder must be 0700");
 const lock=dir+"/.single-flight";await mkdir(lock,{mode:0o700});
 try{
  const {kb}=await loadVerifiedPlatform();
  const vocab={mechanismIds:[...kb.mechanisms.keys()],endpointLevels:kb.parsed.claims.endpointLevels};
  const result=await executeMultitaskRecheck({plan,baseline,vocab,makeCandidate:async(m,task)=>{
   const cfg=readAiConfig({HPI_AI_PROVIDER:"local",HPI_AI_MODEL:m.id,HPI_AI_LOCAL_RUNTIME:"ollama",
    HPI_AI_LOCAL_API:"native",HPI_AI_BASE_URL:"http://127.0.0.1:11434",HPI_AI_MAX_REQUESTS:"1",
    HPI_AI_MAX_INPUT_CHARS:"12000",HPI_AI_MAX_OUTPUT_TOKENS:"1600",HPI_AI_LOCAL_NUM_CTX:"8192",
    HPI_AI_TIMEOUT_MS:"90000",HPI_AI_MAX_RETRIES:"0"});
   const {provider}=await buildProvider(cfg,{task,env:{}});
   return {...m,config:cfg,provider};
  },onTask:r=>console.error(JSON.stringify(r))});
  const file=dir+"/"+new Date().toISOString().replace(/[:.]/g,"-")+".json";
  await writeFile(file,JSON.stringify(result,null,2)+"\n",{mode:0o600,flag:"wx"});
  const {privateRechecks,...summary}=result;
  console.log(JSON.stringify({...summary,privateReport:file},null,2));
 }finally{await rmdir(lock)}
}
