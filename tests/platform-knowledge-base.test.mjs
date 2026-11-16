import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {loadVerifiedPlatform} from "../scripts/platform-verify.mjs";
import {loadPlatformSources,validatePlatform,buildPlatformExports,csvCell,canonicalJson,sha256,PLATFORM_FILES} from "../research-tools/prosperity-platform.mjs";

const read=p=>readFile(p,"utf8");
const base=await loadVerifiedPlatform();
const register=JSON.parse(await read("research/newham-prepilot-decision-register-v0.1.json"));
const refs={sourceCatalog:base.sourceCatalog,
 indicatorIds:new Set(["HPI-A-01","HPI-A-02","HPI-A-03","HPI-B-01","HPI-B-02","HPI-B-03","HPI-B-04","HPI-C-01","HPI-C-02","HPI-D-01","HPI-D-02","HPI-D-03","HPI-E-01","HPI-E-02","HPI-E-03"]),
 gateIds:new Set(["G-01","G-02","G-03","G-04","G-05","G-06","G-07","G-08"]),
 baselineCriteria:register.criteria.map(x=>({id:x.id,weightPercent:x.weightPercent}))};
const fresh=async()=>(await loadPlatformSources(read)).parsed;
const fact=(p,id)=>p.facts.facts.find(f=>f.id===id);
async function rejects(mutate,pattern){
 const parsed=await fresh();mutate(parsed);
 assert.throws(()=>validatePlatform(parsed,refs),err=>{
  assert.ok(err.violations?.some(v=>pattern.test(v)),"expected violation "+pattern+" in:\n"+(err.violations||[err.message]).join("\n"));
  return true;
 });
}

test("real corpus validates with expected scope and only the known staleness warning",()=>{
 const {kb,warnings}=base;
 assert.equal(kb.ctx.size,8);
 assert.ok(kb.facts.size>=17&&kb.claims.size>=42&&kb.mechanisms.size>=19&&kb.gaps.size>=13);
 assert.deepEqual(warnings,["fact F-RECIFE-POPULATION-2022: reference period ended more than three years before review"]);
 for(const ctx of ["UK-NEWHAM","BR-RECIFE","IT-NAPLES"])assert.ok(kb.ctx.has(ctx));
 assert.ok([...kb.ctx.values()].every(c=>c.fieldworkStatus==="NO_GO"));
});
test("every claim resolves to the existing source catalogue rather than a duplicated evidence store",()=>{
 const {kb}=base;
 for(const c of kb.claims.values()){
  const r=kb.catalog.get(c.evidenceId);
  assert.ok(r&&r.kind==="evidence_reference",c.id);
  assert.ok(c.id.startsWith("C-"+c.evidenceId+"-"));
 }
});
test("provenance contract: undeclared missing provenance and stale declarations both fail",async()=>{
 await rejects(p=>{fact(p,"F-GB-PC-TAKEUP-FYE2025").missingProvenance=fact(p,"F-GB-PC-TAKEUP-FYE2025").missingProvenance.filter(m=>m.field!=="sourceSha256")},/sourceSha256 is missing without a declared reason/);
 await rejects(p=>{fact(p,"F-NEWHAM-PC-ELIGIBLE-2023-24").missingProvenance=[{field:"publicationDate",reason:"pretend it is missing"}]},/publicationDate is present but declared missing/);
 await rejects(p=>{fact(p,"F-NEWHAM-PC-ELIGIBLE-2023-24").sourceSha256="abc"},/byte-hashed extraction requires sourceSha256/);
 await rejects(p=>{fact(p,"F-GB-PC-TAKEUP-FYE2025").sourceSha256="a".repeat(64)},/only byte_hashed_extraction may carry a source hash/);
});
test("denominators are never synthesised and source-version drift is detected arithmetically",async()=>{
 await rejects(p=>{fact(p,"F-GLOBAL-EXTREME-POVERTY-2026").denominator={value:8200000000}},/never synthesised/);
 await rejects(p=>{fact(p,"F-NEWHAM-PC-CASELOAD-RATE-2023-24").value=60},/inconsistent with 8800\/11300/);
 await rejects(p=>{fact(p,"F-NEWHAM-PC-RECEIVING-2023-24").value=9100},/values differ from referenced facts/);
 await rejects(p=>{fact(p,"F-NEWHAM-PC-CASELOAD-RATE-2023-24").denominator={factId:"F-GB-PC-TAKEUP-FYE2025",value:62}},/incompatible/);
});
test("units, currencies and measure types must agree",async()=>{
 await rejects(p=>{fact(p,"F-GB-PC-TAKEUP-FYE2025").value=162},/percentages between 0 and 100/);
 await rejects(p=>{fact(p,"F-IT-ADI-AVERAGE-AMOUNT-2026-06").currency="GBP"},/does not match currency/);
 await rejects(p=>{fact(p,"F-RECIFE-POPULATION-2022").unit="furlongs"},/unit: unsupported value/);
 await rejects(p=>{fact(p,"F-RECIFE-POPULATION-2022").value=1488920.5},/counts must be integers/);
});
test("referential integrity and duplicate detection",async()=>{
 await rejects(p=>{p.claims.items[0].evidenceId="E99"},/not in the source catalogue/);
 await rejects(p=>{p.claims.items[3].mechanisms.push("M-DOES-NOT-EXIST")},/unknown mechanism M-DOES-NOT-EXIST/);
 await rejects(p=>{p.problems.items.push({...p.problems.items[0]})},/duplicate ID P-BENEFIT-NONTAKEUP/);
 await rejects(p=>{const c=p.claims.items.find(x=>x.id==="C-E04-1");p.claims.items.push({...c,id:"C-E04-9"})},/duplicate claim statement/);
 await rejects(p=>{p.contexts.items.find(c=>c.id==="UK-NEWHAM").parent="NOWHERE"},/unknown parent/);
});
test("honest labelling: hypotheses cannot carry evidence and evidence-linked mechanisms need claims",async()=>{
 await rejects(p=>{p.claims.items.find(c=>c.id==="C-E03-1").mechanisms.push("M-INSTITUTIONAL-FRAGMENTATION")},/relabel as evidence_linked/);
 await rejects(p=>{p.mechanisms.items.find(m=>m.id==="M-PROCEDURAL-DENIAL").status="evidence_linked";p.claims.items.find(c=>c.id==="C-E11-1").mechanisms=["M-COMPLIANCE-BURDEN"]},/no claim is attached/);
 await rejects(p=>{p.claims.items.find(c=>c.id==="C-E13-1").direction="supports"},/null findings cannot be recorded as supportive/);
 await rejects(p=>{p.claims.items.find(c=>c.id==="C-E09-1").direction="mixed"},/adverse findings must be recorded as adverse/);
});
test("retracted evidence forces withdrawal of claims",async()=>{
 const catalog=structuredClone(base.sourceCatalog);
 catalog.records.find(r=>r.id==="E13").retraction="retracted";
 const parsed=await fresh();
 assert.throws(()=>validatePlatform(parsed,{...refs,sourceCatalog:catalog}),err=>err.violations.some(v=>/E13 is retracted; claim must be withdrawn/.test(v)));
 parsed.claims.items.find(c=>c.id==="C-E13-1").claimType="withdrawn";
 parsed.claims.items.find(c=>c.id==="C-E13-1").direction="null";
 assert.doesNotThrow(()=>validatePlatform(parsed,{...refs,sourceCatalog:catalog}));
});
test("no rankings, scores, markup, unsafe URLs or fieldwork authorisation can enter the knowledge base",async()=>{
 await rejects(p=>{p.contexts.items[2].rank=1},/rankings are not permitted/);
 await rejects(p=>{p.problems.items[0].prosperityScore=72},/rankings are not permitted/);
 await rejects(p=>{p.mechanisms.items[0].description="<img src=x onerror=alert(1)>"},/angle brackets/);
 await rejects(p=>{fact(p,"F-RECIFE-POPULATION-2022").sourceUrl="http://insecure.example/x"},/HTTPS without credentials/);
 await rejects(p=>{p.interventions.items[0].description="see javascript:alert(1)"},/unsafe URL scheme/);
 await rejects(p=>{p.contexts.items.find(c=>c.id==="BR-RECIFE").fieldworkStatus="GO"},/cannot be authorised/);
});
test("maturity is evidence-gated and adoption cannot be fabricated",async()=>{
 await rejects(p=>{p.solutions.items[0].maturity.level=4},/level 4 lacks recorded evidence/);
 await rejects(p=>{const m=p.solutions.items[0].maturity;m.level=5;m.evidence.push({level:4,url:"/x",note:"protocol"},{level:5,url:"/solutions/benefit-access",note:"self-assessed"})},/independent external evaluation/);
 await rejects(p=>{p.solutions.items[0].maturity.blockedNextLevel={level:4,missing:[]}},/blockedNextLevel must name what is missing/);
 await rejects(p=>{p.adoption.partnerships.push({organisation:"City X",evidenceUrl:"https://example.org",verifiedAt:"2026-11-01",verifiedBy:"HPI founder"})},/verifier independent of HPI/);
 await rejects(p=>{p.adoption.adoptionRecords.push({organisation:"Org",solutionId:"SOL-NOPE",evidenceUrl:"https://example.org",verifiedAt:"2026-11-01",verifiedBy:"Independent auditor"})},/unknown solution/);
 await rejects(p=>{p.adoption.usageCount=1200},/usage statistics and testimonials/);
 await rejects(p=>{p.adoption.resources[0].maturityLevel=6},/cannot claim independent evaluation or adoption/);
});
test("benefit-access packages measure verified receipt and cover every outcome stage",async()=>{
 await rejects(p=>{p.solutions.items[0].measurementPlan.primaryOutcome.stage="applied"},/must be verified receipt, not applications/);
 await rejects(p=>{const a=p.solutions.items[0].localAdaptations.find(x=>x.contextId==="IT-NAPLES");p.facts.measurementGaps=p.facts.measurementGaps.filter(g=>g.id!=="G-NAPLES-APPROVALS");a.missingMeasures=a.missingMeasures.filter(g=>g!=="G-NAPLES-APPROVALS")},/stage approved has neither a published measure nor a declared gap/);
 await rejects(p=>{p.solutions.items[0].localAdaptations[0].availableMeasures.push("F-CAMPANIA-RELATIVE-POVERTY-2025")},/belongs to another context/);
 await rejects(p=>{p.solutions.syntheticFunnelDemonstration.label="Example"},/SYNTHETIC ONLY/);
 await rejects(p=>{p.solutions.syntheticFunnelDemonstration.groups.usualServices.received=90},/later funnel stage exceeds earlier stage/);
});
test("opportunity rubric is the F0-02.5 baseline and scores need independent scorers",async()=>{
 await rejects(p=>{const c=p.opportunity.baselineRubric.criteria;c[0].weightPercent=30;c[5].weightPercent=0},/preserve the F0-02.5 criteria and weights/);
 await rejects(p=>{p.opportunity.candidates[0].criterionScores[0].score=5},/independent or community scorer/);
 await rejects(p=>{p.opportunity.candidates[0].criterionScores.pop()},/every baseline criterion must be listed/);
 await rejects(p=>{p.opportunity.candidates[0].vetoStatus.pop()},/status missing/);
});
test("systems lab inputs must be synthetic and within declared bounds",async()=>{
 await rejects(p=>{p.systemsLab.archetypes[0].synthetic=false},/explicitly synthetic/);
 await rejects(p=>{p.systemsLab.scenarios[1].parameters.passThroughShare=1.4},/outside declared bounds/);
 await rejects(p=>{p.systemsLab.scenarios[1].parameters.inventedKnob=3},/unknown parameter/);
 await rejects(p=>{p.systemsLab.models[0].status="validated_forecast"},/disclose that the model is illustrative/);
});
test("exports are byte-deterministic, digest their sources and guard spreadsheet formulas",()=>{
 const a=buildPlatformExports(base.kb,{rawSources:base.raw}),b=buildPlatformExports(base.kb,{rawSources:base.raw});
 assert.equal(canonicalJson(a.knowledgeBase),canonicalJson(b.knowledgeBase));
 assert.equal(a.factsCsv+a.claimsCsv+a.edgesCsv,b.factsCsv+b.claimsCsv+b.edgesCsv);
 for(const [k,f] of Object.entries(PLATFORM_FILES))assert.equal(a.knowledgeBase.sourceDigests[f],sha256(base.raw[k]));
 assert.equal(a.knowledgeBase.adoptionRecords.length,0);
 assert.equal(a.knowledgeBase.partnerships.length,0);
 assert.equal(csvCell("=HYPERLINK(\"x\")"),"\"'=HYPERLINK(\"\"x\"\")\"");
 assert.equal(csvCell("-12.5"),"-12.5");
 assert.equal(csvCell("@cmd"),"'@cmd");
 assert.equal(csvCell("a,b"),'"a,b"');
 const head=a.factsCsv.split("\n")[0].split(",");
 assert.ok(head.includes("redistributionStatus")&&head.includes("verificationLevel")&&head.includes("interpretationGuard"));
 assert.ok(!/"(score|rank|ranking)"\s*:/.test(canonicalJson(a.knowledgeBase)));
});
