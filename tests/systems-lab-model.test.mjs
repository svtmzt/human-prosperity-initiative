import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {computeHousehold,runScenario,compareScenarios,sensitivity,thresholdSensitivity,validateParameters,PARAMETER_DEFAULTS} from "../research-tools/household-resilience-model.mjs";

const lab=JSON.parse(await readFile("research/platform/systems-lab.json","utf8"));
const A=Object.fromEntries(lab.archetypes.map(a=>[a.id,a]));
const p=x=>validateParameters(x,lab.parameterBounds);
const one=(id,params={})=>computeHousehold(A[id],p(params));

test("baseline arithmetic matches hand calculation for every synthetic archetype",()=>{
 const a1=one("A1-LOW-WAGE-RENTER");
 assert.equal(a1.grossEarnings,1400);assert.equal(a1.netEarnings,1232);assert.equal(a1.disposableIncome,1382);
 assert.equal(a1.essentialCosts,1290);assert.equal(a1.residualIncome,92);assert.equal(a1.status,"fragile");
 assert.equal(one("A2-DUAL-EARNER-OWNER").residualIncome,1132.8);
 assert.equal(one("A3-PENSION-AGE-SINGLE").residualIncome,60);
 const a4=one("A4-VARIABLE-EARNER-FAMILY");
 assert.equal(a4.residualIncome,-119.2);assert.equal(a4.status,"deficit");assert.equal(a4.bufferMonths,0.7);
 for(const id of Object.keys(A)){const r=one(id);assert.equal(Math.round((r.disposableIncome-r.essentialCosts)*100)/100,r.residualIncome,"identity "+id)}
});
test("productivity reaches pay only through the pass-through share",()=>{
 const base=one("A1-LOW-WAGE-RENTER");
 assert.equal(one("A1-LOW-WAGE-RENTER",{productivityGrowthPct:50,passThroughShare:0}).grossEarnings,base.grossEarnings);
 assert.equal(one("A1-LOW-WAGE-RENTER",{productivityGrowthPct:10,passThroughShare:0.3}).grossEarnings,1442);
 assert.equal(one("A3-PENSION-AGE-SINGLE",{productivityGrowthPct:20,passThroughShare:1}).residualIncome,60,"no earners: no wage channel");
});
test("growth with low pass-through can lower residual income for every type (S1)",()=>{
 const [s1]=compareScenarios(lab.archetypes,lab.scenarios.filter(s=>s.id==="S1-GROWTH-LOW-PASS-THROUGH"),lab.parameterBounds);
 assert.ok(s1.changes.every(c=>c.residualChange<0));
 const [s2]=compareScenarios(lab.archetypes,lab.scenarios.filter(s=>s.id==="S2-ESSENTIAL-COST-SHOCK"),lab.parameterBounds);
 const pension=s2.changes.find(c=>c.archetypeId==="A3-PENSION-AGE-SINGLE");
 assert.equal(pension.statusBefore,"fragile");assert.equal(pension.statusAfter,"deficit");
 assert.equal(s2.changes.find(c=>c.archetypeId==="A2-DUAL-EARNER-OWNER").statusAfter,"margin");
});
test("automation hours change is scaled by each earner's exposure; uniform hours change is not",()=>{
 const auto=one("A1-LOW-WAGE-RENTER",{automationHoursChangePct:-10});
 assert.equal(auto.grossEarnings,1316,"10% × 0.6 exposure = 6% fewer hours");
 const uniform=one("A1-LOW-WAGE-RENTER",{hoursChangePct:-10});
 assert.equal(uniform.grossEarnings,1260);
});
test("zero, negative and boundary cases are handled without NaN or false shares",()=>{
 const noWork=one("A1-LOW-WAGE-RENTER",{hoursChangePct:-100});
 assert.equal(noWork.grossEarnings,0);assert.equal(noWork.disposableIncome,150);assert.equal(noWork.status,"deficit");
 const nothing=computeHousehold({...A["A3-PENSION-AGE-SINGLE"],transfers:0},p({}));
 assert.equal(nothing.disposableIncome,0);assert.equal(nothing.essentialsShare,null);assert.equal(nothing.housingShare,null);
 assert.equal(nothing.bufferMonths,Math.round(600/890*10)/10);
 const clamp=one("A4-VARIABLE-EARNER-FAMILY",{employmentShareChange:1});
 assert.equal(clamp.grossEarnings,1080,"employment share clamps at 1");
 const unemployed=one("A4-VARIABLE-EARNER-FAMILY",{employmentShareChange:-1});
 assert.equal(unemployed.grossEarnings,0);
 const rich=computeHousehold({...A["A2-DUAL-EARNER-OWNER"],savings:0},p({}));
 assert.equal(rich.bufferMonths,null,"non-depleting households have no buffer countdown");
 for(const r of runScenario(lab.archetypes,{hoursChangePct:-100,transferChangePct:-100},lab.parameterBounds).results)
  for(const v of [r.disposableIncome,r.essentialCosts,r.residualIncome])assert.ok(Number.isFinite(v));
});
test("monotonicity: higher essential costs never raise residual income; higher wages never lower it",()=>{
 for(const id of Object.keys(A)){
  let prev=Infinity;
  for(const h of [-20,0,20,60,120]){const r=one(id,{housingChangePct:h}).residualIncome;assert.ok(r<=prev,id+" housing "+h);prev=r}
  let low=-Infinity;
  for(const w of [-20,0,20,60]){const r=one(id,{nominalWageChangePct:w}).residualIncome;assert.ok(r>=low,id+" wage "+w);low=r}
 }
});
test("invalid parameters and non-synthetic archetypes are rejected",()=>{
 assert.throws(()=>p({passThroughShare:1.5}),/outside bounds/);
 assert.throws(()=>p({inventedKnob:1}),/Unknown model parameter/);
 assert.throws(()=>p({housingChangePct:Number.NaN}),/finite number/);
 assert.throws(()=>p({fragilityThreshold:0.9}),/outside bounds|fragilityThreshold/);
 assert.throws(()=>computeHousehold({...A["A1-LOW-WAGE-RENTER"],synthetic:false},p({})),/explicitly synthetic/);
 assert.throws(()=>computeHousehold({...A["A1-LOW-WAGE-RENTER"],housing:-5},p({})),/non-negative/);
 assert.deepEqual(validateParameters({}),{...PARAMETER_DEFAULTS});
});
test("sensitivity is deterministic, sorted by swing and flags status changes; threshold matters",()=>{
 const s=sensitivity(lab.archetypes,{},lab.parameterBounds);
 assert.deepEqual(sensitivity(lab.archetypes,{},lab.parameterBounds),s);
 assert.ok(s.every(r=>r.swing>=0));
 const a1=s.filter(r=>r.archetypeId==="A1-LOW-WAGE-RENTER");
 for(let i=1;i<a1.length;i++)assert.ok(a1[i-1].swing>=a1[i].swing);
 assert.ok(a1.some(r=>r.statusChanges),"a ±10% wage move changes A1's status");
 const pension=s.filter(r=>r.archetypeId==="A3-PENSION-AGE-SINGLE"&&r.parameter==="nominalWageChangePct")[0];
 assert.equal(pension.swing,0,"wages cannot affect a household with no earners");
 const t=thresholdSensitivity(lab.archetypes,{},lab.parameterBounds);
 const a1status=t.map(x=>x.statuses.find(y=>y.archetypeId==="A1-LOW-WAGE-RENTER").status);
 assert.deepEqual(a1status,["margin","fragile","fragile"]);
});
test("runScenario reports per-type results and counts, never a population average",()=>{
 const run=runScenario(lab.archetypes,{},lab.parameterBounds);
 assert.equal(run.synthetic,true);assert.equal(run.results.length,4);
 assert.deepEqual(run.statusCounts,{deficit:1,fragile:2,margin:1});
 assert.ok(!("averageResidualIncome" in run)&&!("meanResidual" in run));
});
