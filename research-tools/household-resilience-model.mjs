/**
 * MODEL-HHR-01 — Household residual-income resilience model, version 1.0.0.
 *
 * ILLUSTRATIVE MODEL WITH SYNTHETIC INPUTS. Deterministic arithmetic that makes
 * explicit how wages, hours, employment, transfers and essential costs combine.
 * Not a forecast, not calibrated to any country, not evidence about any policy.
 *
 * Browser-safe ES module: no imports, no network, no storage. The same file is
 * published at /systems-lab-model.js and used by the static build.
 */
export const MODEL_ID="MODEL-HHR-01";
export const MODEL_VERSION="1.0.0";
export const PARAMETER_DEFAULTS=Object.freeze({
 nominalWageChangePct:0,productivityGrowthPct:0,passThroughShare:0,hoursChangePct:0,
 automationHoursChangePct:0,employmentShareChange:0,transferChangePct:0,housingChangePct:0,
 energyChangePct:0,foodChangePct:0,otherChangePct:0,fragilityThreshold:0.1
});
export const PARAMETER_LABELS=Object.freeze({
 nominalWageChangePct:"Nominal hourly wage change (%)",
 productivityGrowthPct:"Productivity growth (%)",
 passThroughShare:"Share of productivity growth passed to pay (0–1)",
 hoursChangePct:"Change in hours for all earners (%)",
 automationHoursChangePct:"Automation-related hours change, scaled by exposure (%)",
 employmentShareChange:"Change in employment share (−1 to 1)",
 transferChangePct:"Change in transfers (%)",
 housingChangePct:"Change in housing costs (%)",
 energyChangePct:"Change in energy costs (%)",
 foodChangePct:"Change in food costs (%)",
 otherChangePct:"Change in transport and other essentials (%)",
 fragilityThreshold:"Fragility threshold (share of disposable income)"
});
const round=(v,d=2)=>{const f=10**d;return Math.round((v+Number.EPSILON)*f)/f};
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));

/** Normalise and validate scenario parameters against declared bounds. */
export function validateParameters(params={},bounds={}){
 if(params===null||typeof params!=="object"||Array.isArray(params))throw new Error("Parameters must be an object");
 const out={...PARAMETER_DEFAULTS};
 for(const [key,value] of Object.entries(params)){
  if(!(key in PARAMETER_DEFAULTS))throw new Error("Unknown model parameter: "+key);
  if(typeof value!=="number"||!Number.isFinite(value))throw new Error("Parameter "+key+" must be a finite number");
  const b=bounds[key];
  if(b&&(value<b[0]||value>b[1]))throw new Error("Parameter "+key+" outside bounds ["+b[0]+", "+b[1]+"]");
  out[key]=value;
 }
 if(out.passThroughShare<0||out.passThroughShare>1)throw new Error("passThroughShare must be between 0 and 1");
 if(out.fragilityThreshold<0||out.fragilityThreshold>0.5)throw new Error("fragilityThreshold must be between 0 and 0.5");
 return out;
}
function validateArchetype(a){
 if(!a||typeof a!=="object"||a.synthetic!==true)throw new Error("Only explicitly synthetic archetypes are accepted");
 for(const k of ["transfers","housing","energy","food","otherEssentials","savings"])
  if(typeof a[k]!=="number"||!Number.isFinite(a[k])||a[k]<0)throw new Error("Archetype "+a.id+": "+k+" must be a non-negative number");
 if(!(a.effectiveTaxRate>=0&&a.effectiveTaxRate<1))throw new Error("Archetype "+a.id+": effectiveTaxRate must be in [0,1)");
 if(!Array.isArray(a.earners))throw new Error("Archetype "+a.id+": earners must be an array");
}

/** Compute one synthetic household under a validated parameter set. */
export function computeHousehold(archetype,parameters){
 validateArchetype(archetype);
 const p=parameters;
 const wageMultiplier=Math.max(0,1+p.nominalWageChangePct/100+(p.productivityGrowthPct/100)*p.passThroughShare);
 let gross=0;
 for(const e of archetype.earners){
  const hoursMultiplier=Math.max(0,1+p.hoursChangePct/100+(p.automationHoursChangePct/100)*e.automationExposure);
  const share=clamp(e.employmentShare+p.employmentShareChange,0,1);
  gross+=e.hourlyWage*wageMultiplier*e.monthlyHours*hoursMultiplier*share;
 }
 const netEarnings=gross*(1-archetype.effectiveTaxRate);
 const transfers=Math.max(0,archetype.transfers*(1+p.transferChangePct/100));
 const disposable=netEarnings+transfers;
 const components={
  housing:Math.max(0,archetype.housing*(1+p.housingChangePct/100)),
  energy:Math.max(0,archetype.energy*(1+p.energyChangePct/100)),
  food:Math.max(0,archetype.food*(1+p.foodChangePct/100)),
  otherEssentials:Math.max(0,archetype.otherEssentials*(1+p.otherChangePct/100))
 };
 const essentials=components.housing+components.energy+components.food+components.otherEssentials;
 const residual=disposable-essentials;
 const share=v=>disposable>0?round(v/disposable,4):null;
 const status=residual<0?"deficit":residual<p.fragilityThreshold*disposable?"fragile":"margin";
 return {
  archetypeId:archetype.id,label:archetype.label,synthetic:true,
  grossEarnings:round(gross),netEarnings:round(netEarnings),transfers:round(transfers),
  disposableIncome:round(disposable),
  essentialCosts:round(essentials),components:Object.fromEntries(Object.entries(components).map(([k,v])=>[k,round(v)])),
  residualIncome:round(residual),
  essentialsShare:share(essentials),housingShare:share(components.housing),energyShare:share(components.energy),
  status,
  bufferMonths:residual<0?round(archetype.savings/(-residual),1):null
 };
}

/** Run all archetypes under one scenario. Results are per household type; no population aggregate. */
export function runScenario(archetypes,params={},bounds={}){
 const parameters=validateParameters(params,bounds);
 const results=archetypes.map(a=>computeHousehold(a,parameters));
 return {modelId:MODEL_ID,modelVersion:MODEL_VERSION,synthetic:true,parameters,results,
  statusCounts:{deficit:results.filter(r=>r.status==="deficit").length,fragile:results.filter(r=>r.status==="fragile").length,margin:results.filter(r=>r.status==="margin").length}};
}

/** Compare scenarios with per-archetype changes versus the baseline (first scenario or zero parameters). */
export function compareScenarios(archetypes,scenarios,bounds={}){
 const baseline=runScenario(archetypes,{},bounds);
 return scenarios.map(s=>{
  const run=runScenario(archetypes,s.parameters||{},bounds);
  return {id:s.id,title:s.title,description:s.description,...run,
   changes:run.results.map((r,i)=>({archetypeId:r.archetypeId,
    residualChange:round(r.residualIncome-baseline.results[i].residualIncome),
    disposableChange:round(r.disposableIncome-baseline.results[i].disposableIncome),
    essentialCostChange:round(r.essentialCosts-baseline.results[i].essentialCosts),
    statusBefore:baseline.results[i].status,statusAfter:r.status}))};
 });
}

export const SENSITIVITY_STEPS=Object.freeze({
 nominalWageChangePct:10,productivityGrowthPct:10,passThroughShare:0.1,hoursChangePct:10,
 automationHoursChangePct:10,transferChangePct:10,housingChangePct:10,energyChangePct:10,
 foodChangePct:10,otherChangePct:10
});
/**
 * One-at-a-time sensitivity around a scenario: each parameter moved down and up
 * by its declared step (clamped to bounds). Reports residual-income changes and
 * any status changes per archetype. Not a probabilistic uncertainty analysis.
 */
export function sensitivity(archetypes,params={},bounds={},steps=SENSITIVITY_STEPS){
 const centre=validateParameters(params,bounds);
 const centreRun=archetypes.map(a=>computeHousehold(a,centre));
 const rows=[];
 for(const [key,step] of Object.entries(steps)){
  const b=bounds[key]||[-Infinity,Infinity];
  const lo=key==="passThroughShare"?clamp(centre[key]-step,0,1):clamp(centre[key]-step,b[0],b[1]);
  const hi=key==="passThroughShare"?clamp(centre[key]+step,0,1):clamp(centre[key]+step,b[0],b[1]);
  const low=archetypes.map(a=>computeHousehold(a,{...centre,[key]:lo}));
  const high=archetypes.map(a=>computeHousehold(a,{...centre,[key]:hi}));
  archetypes.forEach((a,i)=>rows.push({parameter:key,archetypeId:a.id,lowValue:round(lo,4),highValue:round(hi,4),
   residualAtLow:low[i].residualIncome,residualAtCentre:centreRun[i].residualIncome,residualAtHigh:high[i].residualIncome,
   swing:round(Math.abs(high[i].residualIncome-low[i].residualIncome)),
   statusChanges:[low[i].status,centreRun[i].status,high[i].status].some(s=>s!==centreRun[i].status)}));
 }
 return rows.sort((x,y)=>x.archetypeId.localeCompare(y.archetypeId)||y.swing-x.swing||x.parameter.localeCompare(y.parameter));
}

/** Fragility threshold sensitivity: how status classifications change with the analytical convention. */
export function thresholdSensitivity(archetypes,params={},bounds={},thresholds=[0.05,0.1,0.15]){
 return thresholds.map(t=>{const run=runScenario(archetypes,{...params,fragilityThreshold:t},bounds);
  return {fragilityThreshold:t,statuses:run.results.map(r=>({archetypeId:r.archetypeId,status:r.status}))}});
}
