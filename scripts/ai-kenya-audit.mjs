import {runKenyaAudit} from "../research-tools/ai-assist/kenya-correction-audit.mjs";
import {mkdir,stat,writeFile} from "node:fs/promises";
const args=process.argv.slice(2);
if(args.join(" ")==="plan")console.log(JSON.stringify({maxMetadataGets:5,maxHeadAttempts:2,dataDownloads:0,paidAiCalls:0},null,2));
else if(args.join(" ")==="run --allow-public-metadata"){
 const dir="qa-artifacts/ai-kenya-correction";
 await mkdir(dir,{recursive:true,mode:0o700});
 if(((await stat(dir)).mode&0o077)!==0)throw Error("Private folder must be 0700");
 const result=await runKenyaAudit();
 const file=dir+"/"+new Date().toISOString().replace(/[:.]/g,"-")+".json";
 await writeFile(file,JSON.stringify(result,null,2)+"\n",{mode:0o600,flag:"wx"});
 console.log(JSON.stringify({file,...result},null,2));
}else throw Error("Usage: plan | run --allow-public-metadata");
