/**
 * Private human-review queue for AI-generated research hypotheses.
 *
 * Location: qa-artifacts/ai-review-queue/ (git-ignored, never read by the
 * website build). A reviewer can record a decision, but no decision promotes
 * anything into the authoritative knowledge base: promotion is a separate,
 * human-authored pull request that edits research/platform/*.json, cites the
 * original source and passes `npm run check`.
 */
import {createHash} from "node:crypto";
import {mkdir,readdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";

export const QUEUE_DIR="qa-artifacts/ai-review-queue";
export const DECISIONS=Object.freeze(["accept_for_curation","reject","needs_full_text"]);

export function itemId(item){
 const {provenance,...core}=item;
 return "AIQ-"+createHash("sha256").update(JSON.stringify(core)).digest("hex").slice(0,16);
}
/** Strip report fields that must not be persisted (none hold secrets, but keep queue files minimal). */
export function queueRecord(report){
 return {schema:"hpi_ai_review_queue/1.0",task:report.task,prompt:report.prompt,provider:report.provider,status:report.status,
  createdAt:report.finishedAt||new Date().toISOString(),humanReviewRequired:true,publishable:false,
  items:report.queue.map(x=>({id:itemId(x),...x,decision:null})),
  quarantined:report.quarantined,blocked:report.blocked,failures:report.failures,totals:report.totals};
}
export async function writeReviewQueue(report,{dir=QUEUE_DIR,stamp=new Date().toISOString().replace(/[:.]/g,"-")}={}){
 await mkdir(dir,{recursive:true});
 const file=join(dir,report.task+"-"+stamp+".json");
 await writeFile(file,JSON.stringify(queueRecord(report),null,2)+"\n");
 return file;
}
export async function listQueue({dir=QUEUE_DIR}={}){
 let files=[];
 try{files=(await readdir(dir)).filter(f=>f.endsWith(".json")&&!f.startsWith("decisions"))}catch{return []}
 const out=[];
 for(const f of files.sort()){try{const q=JSON.parse(await readFile(join(dir,f),"utf8"));for(const i of q.items||[])out.push({file:f,...i})}catch{}}
 return out;
}
/** Record a reviewer decision in the private decisions log. Returns the entry. */
export async function recordDecision({id,decision,reviewer,note="",dir=QUEUE_DIR,now=()=>new Date().toISOString()}){
 if(!/^AIQ-[0-9a-f]{16}$/.test(String(id)))throw new Error("Invalid review item id");
 if(!DECISIONS.includes(decision))throw new Error("Decision must be one of "+DECISIONS.join(", "));
 if(!reviewer||!String(reviewer).trim())throw new Error("A named human reviewer is required");
 const items=await listQueue({dir});
 if(!items.some(i=>i.id===id))throw new Error("Unknown review item "+id);
 const path=join(dir,"decisions.json");
 let log={schema:"hpi_ai_review_decisions/1.0",entries:[]};
 try{log=JSON.parse(await readFile(path,"utf8"))}catch{}
 const entry={id,decision,reviewer:String(reviewer).trim().slice(0,80),note:String(note).slice(0,500),decidedAt:now(),
  promotedToKnowledgeBase:false,nextStep:decision==="accept_for_curation"?"Open a human-authored PR editing research/platform/*.json that cites the original source; the AI item is not evidence.":null};
 log.entries.push(entry);
 await mkdir(dir,{recursive:true});await writeFile(path,JSON.stringify(log,null,2)+"\n");
 return entry;
}
