import test from "node:test";
import assert from "node:assert/strict";
import {loadVerifiedPlatform} from "../scripts/platform-verify.mjs";
import {compareMeasures,deriveRate,rateComparabilityMatrix,stageCoverage,consistencyAudit} from "../research-tools/prosperity-platform.mjs";
import {syntheticFunnelAnalysis,benefitAccessPackage,protocolTemplateMarkdown,readinessChecklistMarkdown} from "../research-tools/platform-artifacts.mjs";
import {assessCandidate,weightSensitivity,weightedScore} from "../research-tools/opportunity-assessment.mjs";
import {sampleSizeTwoProportions,normalQuantile} from "../research-tools/evaluation-design.mjs";

const {kb}=await loadVerifiedPlatform();
const f=id=>kb.facts.get(id);

test("Newham local model rate is never directly comparable with the GB survey take-up figure",()=>{
 const v=compareMeasures(f("F-NEWHAM-PC-CASELOAD-RATE-2023-24"),f("F-GB-PC-TAKEUP-FYE2025"));
 assert.equal(v.comparable,false);
 const dims=v.reasons.map(r=>r.dimension);
 for(const d of ["measure definition","population unit","geography level","method","reference period"])assert.ok(dims.includes(d),d);
 assert.ok(v.reasons.every(r=>r.explanation.length>10));
 // Caseload and expenditure rates from the same table still differ in definition and population unit.
 const same=compareMeasures(f("F-NEWHAM-PC-CASELOAD-RATE-2023-24"),f("F-NEWHAM-PC-EXPENDITURE-RATE-2023-24"));
 assert.equal(same.comparable,false);
 assert.deepEqual(same.reasons.map(r=>r.dimension).sort(),["measure definition","population unit"]);
 assert.equal(compareMeasures(f("F-NEWHAM-PC-RECEIVING-2023-24"),f("F-NEWHAM-PC-RECEIVING-2023-24")).comparable,true);
});
test("no published pair of rates across different contexts is declared comparable",()=>{
 const m=rateComparabilityMatrix(kb);
 const rates=[...kb.facts.values()].filter(x=>x.measureType==="rate").length;
 assert.ok(rates>=6);
 assert.equal(m.length,rates*(rates-1)/2);
 for(const x of m)if(f(x.factA).contextId!==f(x.factB).contextId)assert.equal(x.comparable,false,x.factA+" vs "+x.factB);
});
test("rates derive only from same-source, same-population counts",()=>{
 const ok=deriveRate(f("F-NEWHAM-PC-RECEIVING-2023-24"),f("F-NEWHAM-PC-ELIGIBLE-2023-24"));
 assert.equal(ok.derived,true);assert.equal(ok.value,77.9);
 const council=deriveRate(f("F-NEWHAM-COUNCIL-SUPPORTED-2024-25"),f("F-NEWHAM-PC-NOT-RECEIVING-2023-24"));
 assert.equal(council.derived,false);assert.equal(council.value,null);
 for(const reason of ["different sources","different reference periods","different population units"])assert.ok(council.reasons.includes(reason),reason);
 const cross=deriveRate(f("F-IT-ADI-HOUSEHOLDS-2026-06"),f("F-RECIFE-POPULATION-2022"));
 assert.ok(cross.reasons.includes("different contexts"));
});
test("stage coverage distinguishes local figures, wider-geography figures and declared gaps",()=>{
 const newham=Object.fromEntries(stageCoverage(kb,"UK-NEWHAM","PROG-UK-PENSION-CREDIT").map(r=>[r.stage,r.status]));
 assert.deepEqual(newham,{potentially_eligible:"local_published_measure",applied:"documented_gap",approved:"documented_gap",received:"local_published_measure",sustained_improvement:"documented_gap"});
 const naples=Object.fromEntries(stageCoverage(kb,"IT-NAPLES","PROG-IT-ADI").map(r=>[r.stage,r.status]));
 assert.equal(naples.received,"only_wider_geography");
 const recife=stageCoverage(kb,"BR-RECIFE","PROG-BR-CADUNICO-BOLSA-FAMILIA");
 assert.ok(recife.every(r=>r.status!=="not_recorded"));
 assert.ok(recife.every(r=>r.localFacts.length===0),"No Recife local benefit figure exists and none may be invented");
 for(const ctx of ["UK-NEWHAM","BR-RECIFE","IT-NAPLES"]){
  const sustained=stageCoverage(kb,ctx,kb.ctx.get(ctx).programmes[0]).find(r=>r.stage==="sustained_improvement");
  assert.equal(sustained.status,"documented_gap",ctx);
 }
});
test("deterministic consistency audit surfaces conflicts, endpoint mismatch and non-independent studies",()=>{
 const a=consistencyAudit(kb);
 const types=new Set(a.map(x=>x.type));
 for(const t of ["conflicting_evidence","intermediate_endpoint_only","non_independent_studies","older_evidence","hypothesis_without_evidence","retraction_not_checked","unhashed_facts"])assert.ok(types.has(t),t);
 assert.ok(a.some(x=>x.type==="intermediate_endpoint_only"&&x.entityId==="I-OWNERSHIP-FRAMING"));
 assert.ok(a.some(x=>x.type==="non_independent_studies"&&x.relatedIds.includes("E29")&&x.relatedIds.includes("E30")));
 assert.ok(a.some(x=>x.type==="conflicting_evidence"&&x.entityId==="I-INFORMATION-OUTREACH"));
 assert.deepEqual(consistencyAudit(kb),a,"audit must be deterministic");
 assert.ok(a.every(x=>["caution","info"].includes(x.severity)));
});
test("synthetic funnel shows applications moving without a credible receipt change, and refuses real data",()=>{
 const r=syntheticFunnelAnalysis(kb.parsed.solutions.syntheticFunnelDemonstration);
 const by=Object.fromEntries(r.stages.map(s=>[s.stage,s]));
 assert.equal(by.applied.differencePp,12.5);assert.equal(by.applied.intervalExcludesZero,true);
 assert.equal(by.received.intervalExcludesZero,false);assert.equal(r.receiptIntervalIncludesZero,true);
 assert.equal(by.received.reference.denominator,380,"receipt denominator excludes missing follow-up");
 assert.ok(by.received.differenceInterval95Pp[0]<0&&by.received.differenceInterval95Pp[1]>0);
 assert.match(r.causalInterpretation,/none/);
 assert.throws(()=>syntheticFunnelAnalysis({...kb.parsed.solutions.syntheticFunnelDemonstration,label:"Observed"}),/explicitly synthetic/);
});
test("benefit-access package is reusable, gated and honest about missing measures",()=>{
 const p=benefitAccessPackage(kb);
 assert.equal(p.maturity.level,3);
 assert.equal(p.measurementPlan.primaryOutcome.indicatorId,"HPI-B-01");
 assert.equal(p.localAdaptations.length,3);
 assert.ok(p.ethicalLegalGates.length===8&&p.ethicalLegalGates.every(g=>g.state==="pending"));
 assert.ok(p.readinessDimensions.every(d=>d.status==="not_assessed"));
 assert.ok(p.evidence.some(e=>e.direction==="null"),"null evidence must be carried into the package");
 const recife=p.localAdaptations.find(a=>a.contextId==="BR-RECIFE");
 assert.ok(recife.missingMeasures.length>=4&&recife.availableMeasures.every(m=>m.stage!=="received"));
 assert.match(p.statement,/not authorisation for fieldwork/);
 const md=protocolTemplateMarkdown(kb);
 for(const h of ["## 1. Accountability and approvals","## 4. Outcome stages","## 6. Comparison, estimand and analysis","## 9. Pre-registration and reporting"])assert.ok(md.includes(h),h);
 assert.match(md,/does \*\*not\*\* constitute ethics approval/);
 const checklist=readinessChecklistMarkdown(kb);
 assert.equal((checklist.match(/^## /gm)||[]).length,9);
 assert.match(checklist,/met with evidence/);
});
test("opportunity assessment refuses to score or rank without independent scoring",()=>{
 const o=kb.parsed.opportunity;
 for(const c of o.candidates){
  const r=assessCandidate(c,o);
  assert.equal(r.weightedScore,null);assert.equal(r.fieldDecision,"NO_GO");
  assert.equal(r.scoredCriteria,0);assert.match(r.scoreStatus,/not_scorable: 6 of 6/);
 }
 const s=weightSensitivity(o.candidates,o);
 assert.equal(s.performed,false);assert.match(s.reason,/two fully and independently scored/);
});
test("weighted score and sensitivity work on an explicitly synthetic, independently scored fixture",()=>{
 const o=structuredClone(kb.parsed.opportunity);
 const scored=(id,scores)=>({id,title:id,deskResearchStatus:"GO",criterionScores:o.baselineRubric.criteria.map((c,i)=>({criterionId:c.id,score:scores[i],scorerType:"independent_review"})),vetoStatus:o.vetoes.map(v=>({vetoId:v.id,triggered:false}))});
 const A=scored("SYNTH-A",[5,5,5,5,5,5]),B=scored("SYNTH-B",[0,0,0,0,0,0]),C=scored("SYNTH-C",[5,0,0,0,0,0]);
 assert.equal(weightedScore(A.criterionScores,o.baselineRubric.criteria),100);
 assert.equal(weightedScore(C.criterionScores,o.baselineRubric.criteria),20);
 const r=assessCandidate(A,o);assert.equal(r.fieldDecision,"REQUIRES_HUMAN_DECISION");
 const s=weightSensitivity([A,B,C],o,{step:5});
 assert.equal(s.performed,true);assert.deepEqual(s.baseOrder,["SYNTH-A","SYNTH-C","SYNTH-B"]);
 assert.equal(s.perturbations.length,12);assert.equal(s.orderStable,true);
 const vetoed=structuredClone(A);vetoed.vetoStatus[0].triggered=true;
 assert.equal(assessCandidate(vetoed,o).fieldDecision,"NO_GO","high scores cannot offset a veto");
});
test("sample-size planner matches the textbook two-proportion formula and validates inputs",()=>{
 assert.ok(Math.abs(normalQuantile(0.975)-1.959964)<1e-6);
 assert.ok(Math.abs(normalQuantile(0.8)-0.841621)<1e-6);
 assert.ok(Math.abs(normalQuantile(0.01)+2.326348)<1e-6);
 assert.equal(sampleSizeTwoProportions({baselineRate:0.5,comparisonRate:0.6}).perArmAnalysed,388);
 const r=sampleSizeTwoProportions({baselineRate:0.1,comparisonRate:0.15,attrition:0.2,clusterSize:11,icc:0.05});
 assert.equal(r.designEffect,1.5);
 assert.equal(r.perArmAfterDesignEffect,Math.ceil(r.perArmAnalysed*1.5));
 assert.equal(r.perArmToRecruit,Math.ceil(r.perArmAfterDesignEffect/0.8));
 assert.equal(r.totalToRecruit,r.perArmToRecruit*2);
 assert.ok(sampleSizeTwoProportions({baselineRate:0.1,comparisonRate:0.12}).perArmAnalysed>r.perArmAnalysed,"smaller differences need larger samples");
 for(const bad of [{baselineRate:0,comparisonRate:0.1},{baselineRate:0.1,comparisonRate:0.1},{baselineRate:0.1,comparisonRate:0.2,power:0.3},{baselineRate:0.1,comparisonRate:0.2,attrition:0.95},{baselineRate:0.1,comparisonRate:0.2,clusterSize:0}])
  assert.throws(()=>sampleSizeTwoProportions(bad));
});
