/**
 * HPI-AI.6-T06 metadata-only preflight. No key or inference.
 * Run: npm run ai:cloud:preflight
 */
import {pathToFileURL} from "node:url";
import {readOnlyCloudPreflight} from "../research-tools/ai-assist/cloud-preflight.mjs";
export async function main(){
 const result=await readOnlyCloudPreflight();
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 await main().catch(error=>{console.error("HPI cloud preflight unavailable:",error.message);process.exitCode=2});
}
