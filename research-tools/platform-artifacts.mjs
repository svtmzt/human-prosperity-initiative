/**
 * Deterministic reusable artifacts for the Solutions Engine and Adoption toolkit:
 * synthetic outcome-funnel analysis, the benefit-access evaluation package,
 * an evaluation protocol template and an adaptation readiness checklist.
 * No timestamps, network access or personal data; identical input → identical bytes.
 */
import {wilson95,newcombeDifference95} from "./outcome-evaluation.mjs";
import {stageCoverage} from "./prosperity-platform.mjs";

const pct=v=>Math.round(v*10000)/100;
/**
 * Stage-by-stage synthetic comparison. Applications and approvals use all
 * eligible units; receipt uses units with observed follow-up. Shows how
 * intermediate stages can move without receipt moving.
 */
export function syntheticFunnelAnalysis(demo){
 if(demo?.label!=="SYNTHETIC ONLY")throw new Error("Funnel analysis accepts explicitly synthetic demonstrations only");
 const [refName,cmpName]=Object.keys(demo.groups);
 const ref=demo.groups[refName],cmp=demo.groups[cmpName];
 const stage=(key,r,c)=>{
  const wr=wilson95(r.n,r.d),wc=wilson95(c.n,c.d),diff=newcombeDifference95({received:r.n,observed:r.d},{received:c.n,observed:c.d});
  return {stage:key,reference:{count:r.n,denominator:r.d,ratePct:pct(r.n/r.d),interval95Pct:[pct(wr.lower),pct(wr.upper)]},
   comparison:{count:c.n,denominator:c.d,ratePct:pct(c.n/c.d),interval95Pct:[pct(wc.lower),pct(wc.upper)]},
   differencePp:pct(c.n/c.d-r.n/r.d),differenceInterval95Pp:[pct(diff.lower),pct(diff.upper)],
   intervalExcludesZero:diff.lower>0||diff.upper<0};
 };
 const stages=[
  stage("applied",{n:ref.applied,d:ref.eligible},{n:cmp.applied,d:cmp.eligible}),
  stage("approved",{n:ref.approved,d:ref.eligible},{n:cmp.approved,d:cmp.eligible}),
  stage("received",{n:ref.received,d:ref.eligible-ref.missingFollowup},{n:cmp.received,d:cmp.eligible-cmp.missingFollowup})
 ];
 const receipt=stages[2];
 const missingBounds=g=>({lowerPct:pct(g.received/g.eligible),upperPct:pct((g.received+g.missingFollowup)/g.eligible)});
 return {label:"SYNTHETIC ONLY",statement:demo.statement,referenceGroup:refName,comparisonGroup:cmpName,stages,
  receiptMissingDataBounds:{[refName]:missingBounds(ref),[cmpName]:missingBounds(cmp)},
  interpretation:"In this fictional example the application stage differs clearly while the receipt-stage interval includes zero. An application increase must not be reported as a receipt or income increase.",
  causalInterpretation:"none: fictional, non-randomised illustration",
  intervalMethod:"Wilson score per group; Newcombe-Wilson for differences (conditional independent binomial assumption)",
  receiptIntervalIncludesZero:!receipt.intervalExcludesZero};
}

export function benefitAccessPackage(kb){
 const s=kb.solutions.get("SOL-BENEFIT-ACCESS-EVALUATION");
 const p=kb.parsed;
 const fact=id=>{const f=kb.facts.get(id);return {id:f.id,contextId:f.contextId,stage:f.stage,label:f.label,value:f.value,unit:f.unit,
  referencePeriod:f.referencePeriod.label,method:f.method,sourceOrganization:f.sourceOrganization,sourceUrl:f.sourceUrl,
  verificationLevel:f.verificationLevel,interpretationGuard:f.interpretationGuard}};
 const claim=id=>{const c=kb.claims.get(id),r=kb.catalog.get(c.evidenceId);return {id:c.id,evidenceId:c.evidenceId,statement:c.statement,
  direction:c.direction,endpointLevel:c.endpointLevel,sourceUrl:r.sourceUrl,year:r.year,studyGeography:r.geography,extractionDepth:r.extractionDepth,transferabilityNote:c.transferabilityNote}};
 return {
  schemaVersion:"1.0",kind:"hpi_reusable_evaluation_package",id:s.id,title:s.title,
  status:"methodology_prototype_maturity_level_"+s.maturity.level,
  statement:"A reusable research and evaluation design. Not a delivered service, not a policy recommendation, not an eligibility tool and not authorisation for fieldwork.",
  licence:"CC BY 4.0 (HPI-authored content); cited studies and statistics retain their owners' rights",
  problem:{id:s.problemId,title:kb.problems.get(s.problemId).title},
  mechanisms:s.mechanisms.map(id=>({id,title:kb.mechanisms.get(id).title,status:kb.mechanisms.get(id).status})),
  candidateInterventions:s.candidateInterventions.map(id=>({id,title:kb.interventions.get(id).title,hpiInterpretation:kb.interventions.get(id).hpiInterpretation})),
  outcomeStages:p.solutions.outcomeStages,
  measurementPlan:s.measurementPlan,
  evidence:s.existingEvidenceClaims.map(claim),evidenceLimitations:s.evidenceLimitations,
  prerequisites:{resources:s.resourcePrerequisites,institutional:s.institutionalPrerequisites},
  potentialBenefits:s.potentialBenefits,potentialHarms:s.potentialHarms,
  localAdaptations:s.localAdaptations.map(a=>({...a,
   stageCoverage:stageCoverage(kb,a.contextId,a.programmeId),
   availableMeasures:a.availableMeasures.map(fact),
   missingMeasures:a.missingMeasures.map(id=>kb.gaps.get(id))})),
  ethicalLegalGates:s.ethicalLegalGates.map(id=>(kb.governanceGates||[]).find(g=>g.id===id)||{id,state:"unknown"}),
  governanceIssues:s.governanceIssues.map(n=>"https://github.com/svtmzt/human-prosperity-initiative/issues/"+n),
  readinessDimensions:p.adoption.readinessDimensions.map(r=>({id:r.id,title:r.title,questions:r.questions,status:"not_assessed"})),
  maturity:s.maturity,
  syntheticDemonstration:syntheticFunnelAnalysis(p.solutions.syntheticFunnelDemonstration)
 };
}

export function protocolTemplateMarkdown(kb){
 const s=kb.solutions.get("SOL-BENEFIT-ACCESS-EVALUATION");
 const stages=kb.parsed.solutions.outcomeStages;
 const lines=[
  "# Evaluation protocol template — administrative barriers to benefit access","",
  "Source: Human Prosperity Initiative, "+s.id+" (CC BY 4.0). A template for qualified, authorised institutions. Completing it does **not** constitute ethics approval, methods approval or legal permission.","",
  "## 1. Accountability and approvals","",
  "- Legally accountable operator or sponsor:",
  "- Data controller and lawful basis:",
  "- Independent ethics committee and reference:",
  "- Independent methods reviewer:",
  "- Safeguarding lead and confidential reporting route:",
  "- Agreement with the administering agency (if its processes are involved):","",
  "## 2. Problem, mechanism and context","",
  "- Benefit or service and its eligibility rules (cite official source and date):",
  "- Mechanism(s) targeted (see HPI mechanisms "+s.mechanisms.join(", ")+"):",
  "- Existing services and why the study adds value beyond them (additionality):",
  "- Documented local evidence for the mechanism (not assumed):","",
  "## 3. Population and denominators","",
  "- How eligibility is independently verified:",
  "- Eligible denominator source and date (never synthesised):",
  "- Exclusions and how digitally excluded people are reached:","",
  "## 4. Outcome stages (report each separately)","",
  ...stages.map(x=>"- **"+x.title+"** — definition and data source: … ("+x.guard+")"),"",
  "## 5. Primary and secondary outcomes","",
  "- Primary: "+s.measurementPlan.primaryOutcome.definition,
  ...s.measurementPlan.secondaryOutcomes.map(o=>"- Secondary ("+o.indicatorId+"): "+o.definition),
  "- Harms: "+s.measurementPlan.harmMeasures.join("; "),"",
  "## 6. Comparison, estimand and analysis","",
  "- Comparison: "+s.measurementPlan.comparisonRequirement,
  "- Estimand and analysis population:",
  "- Missing data: "+s.measurementPlan.missingData,
  "- Causal inference: "+s.measurementPlan.causalInference,
  "- Sample size and power (show inputs and sources): "+s.measurementPlan.sampleSize,
  "- Subgroups and equity analyses (prespecified, lawful, powered):","",
  "## 7. Costs and sustainability","",
  "- Delivery cost, participant time cost and evaluation cost reported separately:",
  "- What happens to participants when the study ends:","",
  "## 8. Local adaptation and transferability","",
  "- Readiness dimensions assessed (see the HPI adaptation readiness checklist):",
  "- Known transferability limits:","",
  "## 9. Pre-registration and reporting","",
  "- Registry and date (before enrolment):",
  "- Commitment to publish null and negative results:",
  "- Correction and retraction procedure:",""
 ];
 return lines.join("\n");
}

export function readinessChecklistMarkdown(kb){
 const a=kb.parsed.adoption;
 const lines=["# Adaptation readiness checklist","",
  "Source: Human Prosperity Initiative (CC BY 4.0). Use before adapting any HPI resource to a new context. Status options: "+a.readinessStatuses.join(", ")+". A dimension is only *met with evidence* when you can link to the evidence.","",
  "**Fieldwork, recruitment, personal-data processing or outreach require every dimension to be met with evidence and the relevant specialist review completed.**",""];
 for(const r of a.readinessDimensions){
  lines.push("## "+r.title+" ("+r.id+")","");
  for(const q of r.questions)lines.push("- [ ] "+q);
  lines.push("","Status: not_assessed · Evidence link: · Specialist review required: "+r.specialistReview,"");
 }
 return lines.join("\n");
}
