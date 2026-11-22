import test from "node:test";
import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import {compareScenarios} from "../research-tools/household-resilience-model.mjs";
import {buildHubosManifest,buildHpiAiStatusDelta,MANIFEST_PATH,HPI_AI_DELTA_PATH,EXECUTED_MANIFEST_SHA256,WORKSTREAMS} from "../scripts/hubos-sync-manifest.mjs";

const read=p=>readFile(p,"utf8");
const sha=b=>createHash("sha256").update(b).digest("hex");
const ORIGIN="https://human-prosperity-initiative.vercel.app";
const publication=JSON.parse(await read("dist/publication.json"));
const sitemap=await read("dist/sitemap.xml");
const platformRoutes=sitemap.match(/<loc>[^<]+<\/loc>/g).map(x=>x.slice(5,-6).replace(ORIGIN,"")||"/")
 .filter(r=>/^\/(platform|intelligence|solutions|adopt|systems-lab)(\/|$)/.test(r));
const file=r=>"dist"+r+".html";

test("all four pillars, the hub and their detail pages are published and in the sitemap",()=>{
 for(const r of ["/platform","/platform/it","/intelligence","/intelligence/compare","/intelligence/evidence","/intelligence/methods","/intelligence/data","/intelligence/ai-assistance",
  "/intelligence/contexts/newham","/intelligence/contexts/recife","/intelligence/contexts/naples","/intelligence/mechanisms/compliance-burden",
  "/intelligence/facts/newham-pc-caseload-rate-2023-24","/solutions","/solutions/benefit-access","/solutions/energy-affordability","/solutions/livelihoods","/adopt","/systems-lab"])
  assert.ok(platformRoutes.includes(r),r);
 assert.ok(platformRoutes.length>=70,"expected detail pages for every entity, got "+platformRoutes.length);
 assert.equal(publication.platform.facts,17);assert.equal(publication.platform.aiInference,false);
});
test("every platform page meets the CSP and semantic baseline (no inline code, one h1, canonical, nav)",async()=>{
 for(const r of platformRoutes){
  const html=await read(file(r));
  assert.equal((html.match(/<h1\b/g)||[]).length,1,r);
  assert.ok(html.includes('<link rel="canonical" href="'+ORIGIN+r+'">'),r);
  assert.match(html,/<main id="main" tabindex="-1"/,r);
  assert.match(html,/<nav aria-label="Main navigation">.*href="\/platform">Platform<\/a>/,r);
  assert.doesNotMatch(html,/\sstyle="/i,r+" inline style attribute would be blocked by CSP");
  assert.doesNotMatch(html,/<script(?![^>]*\ssrc=)[^>]*>/i,r+" inline script");
  assert.doesNotMatch(html,/\son[a-z]+="/i,r+" inline event handler");
  assert.doesNotMatch(html,/<form[^>]*\saction=/i,r+" forms must not submit anywhere");
  for(const src of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]))await stat("dist"+src);
  for(const css of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]))await stat("dist"+css);
  assert.doesNotMatch(html,/\branked\s+#?\d|\brank\s*#\d|<th[^>]*>\s*(rank|score)\b/i,r+" no rankings or score columns");
 }
});
test("module scripts are loaded as modules and only same-origin modules are imported",async()=>{
 for(const [route,script] of [["/systems-lab","/systems-lab.js"],["/solutions/benefit-access","/solutions-planner.js"]])
  assert.ok((await read(file(route))).includes('<script src="'+script+'" type="module">'),route);
 for(const s of ["systems-lab.js","solutions-planner.js"]){
  const js=await read("dist/"+s);
  for(const m of js.matchAll(/from "([^"]+)"/g))assert.match(m[1],/^\/[a-z-]+\.js$/,s);
  assert.doesNotMatch(js,/innerHTML|document\.write|localStorage|sessionStorage|cookie/);
 }
 for(const s of ["platform-explorer.js","platform-compare.js","adopt-readiness.js"]){
  const js=await read("dist/"+s);
  assert.doesNotMatch(js,/innerHTML|document\.write|localStorage|sessionStorage|document\.cookie|sendBeacon/,s);
 }
 assert.doesNotMatch(await read("dist/adopt-readiness.js"),/fetch\(/,"readiness self-check must not send data");
});
test("browser model and planner are byte-identical to the tested build modules",async()=>{
 assert.equal(await read("dist/systems-lab-model.js"),await read("research-tools/household-resilience-model.mjs"));
 assert.equal(await read("dist/evaluation-design.js"),await read("research-tools/evaluation-design.mjs"));
 const data=JSON.parse(await read("dist/systems-lab-data.json"));
 const results=JSON.parse(await read("dist/systems-lab-results.json"));
 assert.deepEqual(results.scenarios,compareScenarios(data.archetypes,data.scenarios,data.parameterBounds),"no-JS precomputed results must equal module output");
 assert.ok(data.archetypes.every(a=>a.synthetic===true));
});
test("manifest digests match the published bytes and downloads exist",async()=>{
 const m=JSON.parse(await read("dist/platform-manifest.json"));
 assert.ok(m.outputs.length>=14&&m.sources.length===12);
 for(const o of m.outputs){const b=await readFile("dist"+o.path);assert.equal(sha(b),o.sha256,o.path);assert.equal(b.length,o.bytes,o.path)}
 for(const s of m.sources)assert.equal(sha(await readFile(s.path)),s.sha256,s.path);
 const kb=JSON.parse(await read("dist/platform-knowledge-base.json"));
 assert.equal(kb.adoptionRecords.length,0);assert.equal(kb.partnerships.length,0);
 const pkg=JSON.parse(await read("dist/downloads/benefit-access-evaluation-package.json"));
 assert.equal(pkg.syntheticDemonstration.label,"SYNTHETIC ONLY");
 assert.match(await read("dist/downloads/evaluation-protocol-template.md"),/^# Evaluation protocol template/);
 const cmp=JSON.parse(await read("dist/platform-comparability.json"));
 assert.equal(cmp.pairs.length,17*16/2);
 const ai=JSON.parse(await read("dist/platform-ai-status.json"));
 assert.equal(ai.publishedAiGeneratedContent,0);
});
test("pages state limits honestly: no adoption, synthetic labels, NO-GO fieldwork, AI not connected",async()=>{
 const adopt=await read("dist/adopt.html");
 assert.match(adopt,/Adoption register: 0 entries\. Partnership register: 0 entries\./);
 assert.match(adopt,/Everything you enter stays in this browser tab/);
 const slice=await read("dist/solutions/benefit-access.html");
 assert.match(slice,/SYNTHETIC ONLY/);assert.match(slice,/not authorised fieldwork/);
 for(const ctx of ["Newham","Recife","Naples"])assert.ok(slice.includes(ctx),ctx);
 assert.match(await read("dist/systems-lab.html"),/ILLUSTRATIVE MODEL · SYNTHETIC INPUTS/);
 assert.match(await read("dist/intelligence/ai-assistance.html"),/Public website: no AI inference/);
 const recife=await read("dist/intelligence/contexts/recife.html");
 assert.match(recife,/Fieldwork: NO-GO/);
 const fact=await read("dist/intelligence/facts/newham-pc-caseload-rate-2023-24.html");
 for(const s of ["89f5a5fa831f21c4661d6e73ccb76878959e6ea721fb459b43aa3d9bcd96765c","Interpretation guard","Comparability with related figures","Directly comparable?"])assert.ok(fact.includes(s),s);
 const it=await read("dist/platform/it.html");
 assert.match(it,/<html lang="it">/);assert.match(it,/Traduzione parziale, non revisionata/);
});
test("established routes, tools and research pages still exist and link into the platform",async()=>{
 for(const r of ["/","/mission","/projects","/projects/newham","/research","/tools","/tools/glossary","/research/source-catalog","/research/outcome-lab",
  "/research/reproducibility","/research/responsible-tools","/research/newham-prepilot","/roadmap","/activity","/status","/library","/initiatives/rt-02"])
  await stat(r==="/"?"dist/index.html":file(r));
 const home=await read("dist/index.html");
 for(const r of ["/platform","/intelligence","/solutions","/adopt","/systems-lab"])assert.ok(home.includes('href="'+r+'"'),r);
 assert.ok((await read("dist/tools.html")).includes('href="/intelligence/compare"'));
 assert.ok((await read("dist/research.html")).includes('href="/intelligence"'));
 for(const id of ["hpi-scale","gpi","see","gan","esl","hpi-ai","hpi-qa"])await stat("dist/initiatives/"+id+".html");
});
test("executed HubOS manifest is immutable; HPI-AI delta is current, non-colliding and never marks human gates done",async()=>{
 const project=JSON.parse(await read("portfolio/project.json")),roadmap=JSON.parse(await read("portfolio/public-roadmap.json"));
 const executedText=await read(MANIFEST_PATH);
 assert.equal(createHash("sha256").update(executedText).digest("hex"),EXECUTED_MANIFEST_SHA256,"executed registration (HubOS #152) must never be rewritten");
 // The historical v0.2 HubOS delta was already executed in November.
 // A new HPI-AI.6 editorial roadmap must never silently rewrite it.
 const archivedDeltaText=await read(HPI_AI_DELTA_PATH);
 const d=JSON.parse(archivedDeltaText);
 assert.equal(d.schemaVersion,"1.0");
 assert.equal(d.executed,false,"historical manifest retains its original pre-execution status");
 assert.deepEqual(d.counts,{updates:2,appendProjects:0,appendEpics:2,appendTasks:4,appendTaskResources:7,collisions:0});
 assert.ok(!d.appends.epics.some(e=>e.id==="hpi-ai-6"),"new epic must have a separate audited production receipt");
 assert.ok(roadmap.initiatives.find(i=>i.id==="HPI-AI").epics.some(e=>e.id==="HPI-AI.6"),
  "new HPI-AI.6 must be tracked in the current public roadmap");
 assert.equal(d.executed,false);assert.equal(d.collisions.length,0);assert.equal(d.createsCompanyRecord,false);
 assert.ok([...d.updates.map(u=>u.id),...Object.values(d.appends).flat().map(r=>r.id)].every(id=>/^hpi-(ai|link-hpi-ai)/.test(id)),"delta touches HPI-AI only");
 assert.ok(d.appends.tasks.filter(t=>/HUMAN\/EXTERNAL GATE/.test(t.description)).every(t=>t.status!=="done"));
 assert.ok(d.updates.filter(u=>u.collection==="tasks").every(u=>u.set.status!=="done"||!/GATE/.test(u.set.description||"")));
 assert.ok(typeof buildHubosManifest==="function");
 const m=JSON.parse(executedText);
 assert.equal(m.executed,false);assert.equal(m.createsCompanyRecord,false);assert.equal(m.status,"pending_operator_execution");
 assert.ok(!("companies" in m.records));
 const all=[...m.records.projects,...m.records.epics,...m.records.tasks];
 assert.ok(all.every(r=>r.companyId==="human-prosperity-initiative"));
 const ids=[...all,...m.records.taskResources].map(r=>r.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ids)assert.ok(!/^hpi-(f0-|f1|f2|f3|rt-01)/.test(id),"collides with existing HubOS HPI prefix: "+id);
 assert.equal(m.records.projects.length,WORKSTREAMS.length);
 assert.ok(m.records.tasks.filter(t=>/HUMAN\/EXTERNAL GATE/.test(t.description)).every(t=>t.status!=="done"),"human gates are never done");
});
