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
 *   node scripts/hubos-sync-manifest.mjs            write the manifest
 *   node scripts/hubos-sync-manifest.mjs --check    fail if the committed manifest is stale
 */
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {pathToFileURL} from "node:url";

export const MANIFEST_PATH="portfolio/hubos-sync/hpi-scale-registration-v0.1.json";
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
async function main(){
 const project=JSON.parse(await readFile("portfolio/project.json","utf8"));
 const roadmap=JSON.parse(await readFile("portfolio/public-roadmap.json","utf8"));
 const text=JSON.stringify(buildHubosManifest(project,roadmap),null,2)+"\n";
 if(process.argv.includes("--check")){
  const current=await readFile(MANIFEST_PATH,"utf8").catch(()=>"");
  if(current!==text){console.error("HubOS manifest is stale; run node scripts/hubos-sync-manifest.mjs");process.exitCode=1;return}
  console.log("HubOS pending manifest is current (not executed).");return;
 }
 await mkdir("portfolio/hubos-sync",{recursive:true});
 await writeFile(MANIFEST_PATH,text);
 console.log("Wrote",MANIFEST_PATH);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
