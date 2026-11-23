import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {buildBlindPracticePack,auditIndependentIntake,MIN_INDEPENDENT_CASES_PER_TASK}
 from "../research-tools/ai-assist/independent-review-intake.mjs";
import {SCIENTIFIC_TASKS} from "../research-tools/ai-assist/scientific-validation.mjs";
const hash=x=>createHash("sha256").update(String(x)).digest("hex");
const src={id:"S01",url:"https://example.org/public-study",
 text:"The paper reports no statistically significant effect on benefit receipt.",
 dataClass:"public_research_metadata"};
const item={id:"claim:S01",task:"claim-extraction",sources:[src],
 reference:{claims:[{direction:"null",endpointLevel:"receipt",secretInternalTruth:"MUST_NOT_LEAK"}]}};
test("blinded practice pack never exports reference truth, model answers or scientific eligibility",()=>{
 const pack=buildBlindPracticePack({items:[item]});
 assert.equal(pack.caseCount,1);
 assert.equal(pack.taskCounts["claim-extraction"],1);
 assert.equal(pack.eligibleAsIndependentHeldOut,false);
 assert.equal(pack.referenceLabelsIncluded,false);
 assert.equal(pack.modelAnswersIncluded,false);
 const s=JSON.stringify(pack);
 for(const token of ["secretInternalTruth","MUST_NOT_LEAK","reference","groundTruth","expectedLabel"]){
  assert.equal(s.includes(token),token==="reference"); // referenceLabelsIncluded metadata is intentionally false.
 }
 assert.match(pack.cases[0].sources[0].sha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(pack.cases[0].reviewerFields.slice(0,2),["quoteLocator","effectDirection"]);
});
test("practice pack refuses to export private personal, non-licensed, or injection-bearing sources",()=>{
 const unsafe={items:[
  {...item,id:"claim:S02",sources:[{...src,id:"S02",dataClass:"internal_draft"}]},
  {...item,id:"claim:S03",sources:[{...src,id:"S03",text:"Contact example.person@example.org for records."}]},
  {...item,id:"claim:S04",sources:[{...src,id:"S04",url:"http://insecure.example.org/public-study"}]}
 ]};
 const pack=buildBlindPracticePack(unsafe);
 assert.equal(pack.caseCount,0);
 assert.equal(pack.excluded.length,3);
});
test("blank reviewer intake blocks independently certified scientific status and publication",()=>{
 const r=auditIndependentIntake();
 assert.equal(r.counts.eligibleWithDocumentedProvenance,0);
 assert.equal(r.administrativelyComplete,false);
 assert.equal(r.independentScientificValidation,false);
 assert.equal(r.publicationAuthorised,false);
 for(const t of SCIENTIFIC_TASKS)
  assert.ok(r.blockers.includes("insufficient_independent_"+t));
});
const caseOf=(task,n)=>({
 caseId:"case_"+task+"_"+n,task,origin:"new_independent_licensed_holdout",
 fromPreviousHpiInternalEvaluation:false,
 sourceSha256:hash(task+"_"+n),sourceUrl:"https://example.org/independent-study",
 reuseBasis:"Licensed for reuse by qualified research reviewers",
 licenseEvidenceUrl:"https://example.org/license",population:"eligible families",
 geography:"United Kingdom",outcome:"receipt",samplingStratum:"null finding",
 containsPersonalOrBeneficiaryRecords:false,modelAnswerExposedToReviewers:false
});
const twoReviewers=[
 {reviewerPseudonym:"reviewer_A",qualificationReceiptSha256:hash("qualification-a"),
  independentFromHpiModels:true,conflictOfInterestStatus:"cleared_by_human",
  qualificationVerifiedByHuman:true,qualificationsVerifiedAt:"2026-11-22T23:00:00Z"},
 {reviewerPseudonym:"reviewer_B",qualificationReceiptSha256:hash("qualification-b"),
  independentFromHpiModels:true,conflictOfInterestStatus:"cleared_by_human",
  qualificationVerifiedByHuman:true,qualificationsVerifiedAt:"2026-11-22T23:00:00Z"}
];
const protocol={sourceManifestSha256:hash("sources"),analysisPlanSha256:hash("analysis"),
 lockedAt:"2026-11-23T00:00:00Z",signedHumanPreregistration:true,
 publicPreregistrationReceiptUrl:"https://example.org/preregistration"};
const reviewsOf=c=>[
 {caseId:c.caseId,reviewerPseudonym:"reviewer_A",sealedJudgmentSha256:hash("a"+c.caseId),
  sealedAt:"2026-11-23T01:00:00Z",blindedToModelOutputs:true,reviewedSourceIndependently:true},
 {caseId:c.caseId,reviewerPseudonym:"reviewer_B",sealedJudgmentSha256:hash("b"+c.caseId),
  sealedAt:"2026-11-23T02:00:00Z",blindedToModelOutputs:true,reviewedSourceIndependently:true}
];
const adjudicationOf=c=>({caseId:c.caseId,adjudicatorPseudonym:"reviewer_C",
 adjudicationReceiptSha256:hash("c"+c.caseId),resolvedAt:"2026-11-23T03:00:00Z",
 humanAdjudicated:true,unresolved:false});
test("100 per task + independent structural receipts are admin progress only, never scientific approval",()=>{
 const cases=SCIENTIFIC_TASKS.flatMap(task=>Array.from({length:MIN_INDEPENDENT_CASES_PER_TASK},(_,i)=>caseOf(task,i)));
 const report=auditIndependentIntake({protocol,cases,reviewers:twoReviewers,
  reviews:cases.flatMap(reviewsOf),adjudications:cases.map(adjudicationOf)});
 assert.equal(report.counts.eligibleWithDocumentedProvenance,500);
 assert.equal(report.counts.doubleReviewed,500);
 assert.equal(report.counts.adjudicationComplete,500);
 assert.equal(report.administrativelyComplete,true);
 assert.equal(report.independentScientificValidation,false);
 assert.equal(report.externalEvidenceVerificationStillRequired,true);
 assert.equal(report.publicationAuthorised,false);
});
test("duplicate item, missing human evidence and reviewer self-adjudication fail closed",()=>{
 const c=caseOf("claim-extraction",1);
 const r=auditIndependentIntake({protocol,cases:[c,c],reviewers:twoReviewers,
  reviews:reviewsOf(c),adjudications:[{...adjudicationOf(c),adjudicatorPseudonym:"reviewer_A"}]});
 assert.ok(r.blockers.includes("duplicate_case_id"));
 assert.ok(r.blockers.includes("human_adjudication_receipt_missing_or_unresolved"));
 assert.equal(r.administrativelyComplete,false);
});
test("reviewers must sign independently after preregistration, before adjudication",()=>{
 const c=caseOf("claim-extraction",1);
 const r=auditIndependentIntake({protocol,cases:[c],reviewers:twoReviewers,
  reviews:[{...reviewsOf(c)[0],sealedAt:"2026-11-22T20:00:00Z"},reviewsOf(c)[1]],
  adjudications:[adjudicationOf(c)]});
 assert.ok(r.blockers.includes("invalid_or_unsealed_independent_review"));
 assert.ok(r.blockers.includes("fewer_than_two_distinct_sealed_reviewers"));
});
