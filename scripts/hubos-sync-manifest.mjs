/**
 * Generate the HubOS pending synchronisation manifest for HPI-SCALE workstreams
 * from the canonical HPI public roadmap. Records follow HubOS types
 * (Project / Epic / Task / TaskResource) under the EXISTING company record
 * `human-prosperity-initiative`. No company record is created.
 *
 * This file is NOT a production write. Execution requires an authorised HubOS
 * operator following the CAS-guarded procedure in docs/portfolio-sources/hpi.md
 * of the HubOS repository.
 *
 * The v0.1 registration manifest was EXECUTED in HubOS production on
 * 16 November 2026 (store 235 → 236, HubOS #152). It is now an immutable
 * historical record pinned by SHA-256 and is never regenerated. Later status
 * changes are emitted as separate pending update deltas that touch only
 * existing IDs or append new, non-colliding records.
 *
 *   node scripts/hubos-sync-manifest.mjs            write the pending HPI-AI status delta
 *   node scripts/hubos-sync-manifest.mjs --check    verify the executed manifest is unchanged and the delta is current
 */
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {pathToFileURL} from "node:url";

export const MANIFEST_PATH="portfolio/hubos-sync/hpi-scale-registration-v0.1.json";
export const EXECUTED_MANIFEST_SHA256="3aa5abe26e9a6b75a5952df7d3b0a729e9e885ceabd2f673934901b378d781bf";
export const HPI_AI_DELTA_PATH="portfolio/hubos-sync/hpi-ai-status-update-v0.2.json";
export const WORKSTREAMS=Object.freeze(["HPI-SCALE","GPI","SEE","GAN","ESL","HPI-AI","HPI-QA"]);
const COMPANY="human-prosperity-initiative";
const CREATED="2026-11-16T09:30:00.000Z";
const hubId=id=>"hpi-"+String(id).toLowerCase().replace(/^hpi-/,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const TASK_STATUS={complete:"done",documented:"done",in_progress:"doing",review:"doing",planned:"backlog",blocked:"backlog"};
const PROJECT_STATUS={complete:"done",in_progress:"in-progress",planned:"planned",blocked:"blocked",review:"in-progress"};

export function buildHubosManifest(project,roadmap){
 const byId=new Map(roadmap.initiatives.map(x=>[x.id,x]));
 const projects=[],epics=[],tasks=[],taskResources=[];
 let rank=0;
 for(const id of WORKSTREAMS){
  const d=project.initiatives.find(x=>x.id===id),r=byId.get(id);
  if(!d||!r)throw new Error("Workstream missing from canonical roadmap: "+id);
  const pid=hubId(id);
  projects.push({id:pid,companyId:COMPANY,title:id+" — "+d.name,
   description:r.summary+" Canonical issue https://github.com/svtmzt/human-prosperity-initiative/issues/"+d.issue+". Gate: "+r.gate,
   phase:"ops",status:PROJECT_STATUS[d.status]||"planned",createdAt:CREATED,updatedAt:CREATED});
  for(const e of r.epics){
   const eid=hubId(e.id);
   epics.push({id:eid,companyId:COMPANY,projectId:pid,title:e.id+" — "+e.title,
    description:"Canonical issue https://github.com/svtmzt/human-prosperity-initiative/issues/"+e.issue+". Engineering status only; not scientific, ethical or legal approval.",
    status:e.status==="complete"?"done":"open",createdAt:CREATED,updatedAt:CREATED});
   for(const t of e.tasks){
    const tid=hubId(t.id);
    const human=Boolean(t.assurance)||t.status==="blocked";
    tasks.push({id:tid,companyId:COMPANY,projectId:pid,epicId:eid,title:t.id+" — "+t.title,
     description:(human?"HUMAN/EXTERNAL GATE — remains open until genuine evidence exists. ":"")+"Canonical source: "+t.sourceIssue+(t.evidence?". Technical PR evidence: "+t.evidence:"")+".",
     priority:(d.priority||"P1").toLowerCase(),category:human?"governance":"engineering",status:TASK_STATUS[t.status]||"backlog",
     sprint:d.horizon==="Now"?"current":"next",rank:++rank,createdAt:CREATED,updatedAt:CREATED});
    taskResources.push({id:"hpi-link-"+tid+"-issue",taskId:tid,label:t.id+" canonical HPI issue",url:t.sourceIssue,kind:"link",createdAt:CREATED,updatedAt:CREATED});
    if(t.evidence)taskResources.push({id:"hpi-link-"+tid+"-pr",taskId:tid,label:t.id+" technical PR evidence",url:t.evidence,kind:"link",createdAt:CREATED,updatedAt:CREATED});
   }
  }
 }
 return {
  schemaVersion:"1.0",kind:"hubos_pending_additive_registration",
  status:"pending_operator_execution",executed:false,
  statement:"Pending, unexecuted additive registration for the existing HubOS HPI public-interest portfolio grouping. Not evidence that HubOS production contains these records.",
  targetCompanyId:COMPANY,createsCompanyRecord:false,
  sourceOfTruth:"HPI GitHub public roadmap (portfolio/public-roadmap.json); HubOS tracks portfolio execution only",
  collisionCheck:{checkedAgainst:"svtmzt/the-hub-os web/src/data/hpi-portfolio.ts and hpi-rt01-portfolio.ts at commit 2aef0b9d134db31c2c607194d8881eabc0ede24b",
   existingHpiIdPrefixes:["hpi-f0-","hpi-f1","hpi-f2","hpi-f3","hpi-rt-01"],newIdPrefixes:WORKSTREAMS.map(hubId),
   liveProductionStoreChecked:false,reason:"No Neon or HubOS production access in the authoring session"},
  operatorProcedure:["Read public.hub_os_store id='default'; record revision and confirm exactly one company record 'human-prosperity-initiative'.",
   "Confirm none of the IDs below exists in projects, epics, tasks or taskResources; abstain on any collision.",
   "Back up the full row under a new unique key in public.hub_os_hpi_registration_backups; never overwrite a backup.",
   "In one transaction conditioned on the recorded version, append only these records to the four arrays and increment the version.",
   "Read back: exactly +"+projects.length+" projects, +"+epics.length+" epics, +"+tasks.length+" tasks, +"+taskResources.length+" task resources; non-HPI counts unchanged.",
   "Record version, backup key and audit in HPI issue #96 and the HubOS portfolio tracker; only then set status to executed."],
  counts:{projects:projects.length,epics:epics.length,tasks:tasks.length,taskResources:taskResources.length},
  records:{projects,epics,tasks,taskResources}
 };
}
/**
 * Pending in-place status update for the HPI-AI workstream: compares the
 * current roadmap with the executed registration and lists (a) field updates
 * to records that already exist in HubOS and (b) new records to append.
 */
export function buildHpiAiStatusDelta(project,roadmap,executed,{updatedAt="2026-11-16T18:00:00.000Z"}={}){
 const current=buildHubosManifest(project,roadmap).records;
 const old=executed.records;
 const isAi=r=>r.id==="hpi-ai"||String(r.id).startsWith("hpi-ai-")||String(r.taskId||"").startsWith("hpi-ai-")||String(r.id).startsWith("hpi-link-hpi-ai-");
 const updates=[],appends={projects:[],epics:[],tasks:[],taskResources:[]};
 for(const kind of Object.keys(appends)){
  const before=new Map(old[kind].map(r=>[r.id,r]));
  for(const r of current[kind].filter(isAi)){
   const prev=before.get(r.id);
   if(!prev){appends[kind].push({...r,createdAt:updatedAt,updatedAt});continue}
   const fields={};
   for(const k of Object.keys(r))if(!["createdAt","updatedAt","rank"].includes(k)&&JSON.stringify(r[k])!==JSON.stringify(prev[k]))fields[k]=r[k];
   if(Object.keys(fields).length)updates.push({collection:kind,id:r.id,set:{...fields,updatedAt}});
  }
 }
 const allIds=new Set(Object.values(old).flat().map(r=>r.id));
 const collisions=Object.values(appends).flat().filter(r=>allIds.has(r.id)).map(r=>r.id);
 return {schemaVersion:"1.0",kind:"hubos_pending_status_update",status:"pending_operator_execution",executed:false,
  statement:"Pending, unexecuted HPI-AI status update for records registered by the executed v0.1 manifest (HubOS #152). Not evidence that HubOS production has changed.",
  basedOnExecutedManifest:{path:MANIFEST_PATH,sha256:EXECUTED_MANIFEST_SHA256,storeVersionAfterExecution:236},
  targetCompanyId:COMPANY,createsCompanyRecord:false,scope:"HPI-AI workstream only",
  operatorProcedure:["Read public.hub_os_store id='default'; record the version (expected ≥ 236).",
   "Confirm every 'updates' id exists and no 'appends' id exists; abstain on any mismatch.",
   "Back up the full row under a new unique key; never overwrite a backup.",
   "In one version-conditioned transaction apply only the listed field updates and appends; increment the version.",
   "Read back and record version, backup key and audit in HPI #101 and HubOS; only then mark this delta executed."],
  counts:{updates:updates.length,appendProjects:appends.projects.length,appendEpics:appends.epics.length,appendTasks:appends.tasks.length,appendTaskResources:appends.taskResources.length,collisions:collisions.length},
  updates,appends,collisions};
}

async function main(){
 const project=JSON.parse(await readFile("portfolio/project.json","utf8"));
 const roadmap=JSON.parse(await readFile("portfolio/public-roadmap.json","utf8"));
 const executedText=await readFile(MANIFEST_PATH,"utf8");
 const {createHash}=await import("node:crypto");
 if(createHash("sha256").update(executedText).digest("hex")!==EXECUTED_MANIFEST_SHA256){console.error("The executed HubOS registration manifest was modified; it is an immutable historical record.");process.exitCode=1;return}
 const text=JSON.stringify(buildHpiAiStatusDelta(project,roadmap,JSON.parse(executedText)),null,2)+"\n";
 if(process.argv.includes("--check")){
  const current=await readFile(HPI_AI_DELTA_PATH,"utf8").catch(()=>"");
  if(current!==text){console.error("HPI-AI HubOS delta is stale; run node scripts/hubos-sync-manifest.mjs");process.exitCode=1;return}
  console.log("Executed manifest unchanged; HPI-AI pending delta current (not executed).");return;
 }
 await mkdir("portfolio/hubos-sync",{recursive:true});
 await writeFile(HPI_AI_DELTA_PATH,text);
 console.log("Wrote",HPI_AI_DELTA_PATH);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
