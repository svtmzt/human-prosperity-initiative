import {readFile,lstat} from "node:fs/promises";
import {join} from "node:path";
import {homedir} from "node:os";
import {inspectCandidateBatch} from "../research-tools/ai-assist/benchmark-candidate-intake.mjs";
if(process.argv.slice(2).join(" ")!=="batch01")throw Error("Usage: batch01");
const dir=join(homedir(),"Library/Application Support/HPI/scientific-research/benchmark-expansion");
const load=async name=>{
 const p=join(dir,name),s=await lstat(p);
 if(!s.isFile()||(s.mode&0o077)!==0||s.size>1000000)throw Error("Private regular file required");
 return JSON.parse(await readFile(p,"utf8"));
};
if(((await lstat(dir)).mode&0o077)!==0)throw Error("Private directory required");
const [pack,provenance]=await Promise.all([load("2026-11-24-batch01-candidates.json"),load("2026-11-24-batch01-provenance.json")]);
const existing=JSON.parse(await readFile("research/ai/evaluation-set-v1.json","utf8"));
console.log(JSON.stringify(inspectCandidateBatch({pack,provenance,existing,ledger:await readFile("research/evidence-ledger.csv","utf8")}),null,2));
