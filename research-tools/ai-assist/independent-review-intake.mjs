/**
 * HPI-AI.6-T07 — independent human review intake and BLINDED PRACTICE packs.
 * This code cannot certify reviewers' identities, provenance, ethics,
 * licences or ground truth. Only qualified independent people can do so.
 */
import {createHash} from "node:crypto";
import {SCIENTIFIC_TASKS} from "./scientific-validation.mjs";
import {classifySource,checkRouting} from "./policy.mjs";
import {scanForInjection} from "./safeguards.mjs";
const HASH=/^[a-f0-9]{64}$/;
const TASKS=[...SCIENTIFIC_TASKS];
const RUBRICS=Object.freeze({
 "claim-extraction":["quoteLocator","effectDirection","effectSize","unit","outcomeLevel","population","denominator","uncertainty","limitations"],
 "source-classification":["studyDesign","comparator","measuredVariables","bias","causalLimitations","uncertainty"],
 "mechanism-tagging":["mechanismId","observedOrHypothesised","directEvidenceLocator","uncertainty"],
 "evidence-gap-detection":["observedFields","missingFields","denominatorMissing","evidenceStage","uncertainty"],
 "contradiction-detection":["relation","comparability","populationDifference","periodDifference","unitDifference","denominatorDifference","sourceLocators","uncertainty"]
});
const sha=v=>createHash("sha256").update(v).digest("hex");
const uniq=a=>new Set(a).size===a.length;
export const MIN_INDEPENDENT_CASES_PER_TASK=100;
const simpleHttps=x=>typeof x==="string"&&/^https:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#][^\s]*)?$/.test(x);
const validTime=x=>typeof x==="string"&&!Number.isNaN(Date.parse(x));
const safeId=x=>typeof x==="string"&&/^[a-zA-Z0-9:._-]{2,100}$/.test(x);

/**
 * Export versioned EXISTING INTERNAL evaluation sources as practice material,
 * not as an independent hold-out. Never includes reference labels, model
 * responses, scoring metrics, answers or identity data.
 * A source not explicitly safe for cloud/public excerpt reuse is excluded.
 */
export function buildBlindPracticePack(dataset,{generatedAt="2026-11-23T00:00:00.000Z"}={}){
 if(!Array.isArray(dataset?.items)||!validTime(generatedAt))
  throw new Error("Invalid practice input");
 const cases=[],excluded=[];
 for(const item of dataset.items){
  if(!safeId(item.id)||!TASKS.includes(item.task)||!Array.isArray(item.sources)||!item.sources.length){
   excluded.push({caseId:String(item.id??"invalid"),reason:"invalid_case"});continue;
  }
  const sources=[];
  let reason=null;
  for(const source of item.sources){
   const cls=classifySource(source);
   if(!checkRouting({dataClass:cls.dataClass,boundary:"free_cloud"}).allowed ||
      !["public_research_metadata","redistributable_excerpt"].includes(cls.dataClass)){
    reason="source_not_publicly_reusable";break;
   }
   if(!safeId(source.id)||!simpleHttps(source.url)||
    typeof source.text!=="string"||source.text.length<10||source.text.length>12000||
    scanForInjection(source.text).length){
    reason="source_unsafe_or_unverifiable";break;
   }
   sources.push({sourceId:source.id,url:source.url,
    publicExcerpt:source.text,sha256:sha(source.text),dataClass:cls.dataClass});
  }
  if(reason){excluded.push({caseId:item.id,reason});continue;}
  cases.push({caseId:item.id,task:item.task,
   sources,reviewerFields:[...RUBRICS[item.task]]});
 }
 const taskCounts=Object.fromEntries(TASKS.map(t=>[t,cases.filter(x=>x.task===t).length]));
 const withoutInternalAnswers=cases;
 const digest=sha(JSON.stringify(withoutInternalAnswers));
 return {schema:"hpi_ai6_blinded_practice_pack_v1",
  classification:"PRIVATE_TRAINING_ONLY_INTERNAL_EXAMPLES",
  generatedAt,referenceLabelsIncluded:false,modelAnswersIncluded:false,
  eligibleAsIndependentHeldOut:false,scientificValidation:false,
  practiceSourceDigestSha256:digest,
  taskCounts,excluded,caseCount:cases.length,cases:withoutInternalAnswers,
  caution:"Known HPI internal examples. For reviewer training only, never included in the independently blinded hold-out."};
}
/**
 * Reports which indispensable pieces of independent gold creation are absent.
 * This is a *readiness diagnostic only*, not scientific or identity approval.
 * Never derives correctness from LLM or reviewer agreement alone.
 */
export function auditIndependentIntake({
 protocol=null,cases=[],reviewers=[],reviews=[],adjudications=[]
}={}){
 if(![cases,reviewers,reviews,adjudications].every(Array.isArray))
  throw new Error("Review intake collections must be arrays");
 const issues=[],countByTask=Object.fromEntries(TASKS.map(t=>[t,0]));
 const validCases=new Map(),ids=cases.map(c=>c?.caseId);
 if(!uniq(ids))issues.push("duplicate_case_id");
 for(const c of cases){
  const ok=safeId(c?.caseId)&&TASKS.includes(c.task)&&
   c.origin==="new_independent_licensed_holdout"&&
   c.fromPreviousHpiInternalEvaluation!==true&&
   HASH.test(c.sourceSha256??"")&&
   simpleHttps(c.sourceUrl)&&
   typeof c.reuseBasis==="string"&&c.reuseBasis.length>=12&&
   typeof c.licenseEvidenceUrl==="string"&&simpleHttps(c.licenseEvidenceUrl)&&
   typeof c.population==="string"&&c.population.trim().length>=2&&
   typeof c.geography==="string"&&c.geography.trim().length>=2&&
   typeof c.outcome==="string"&&c.outcome.trim().length>=2&&
   typeof c.samplingStratum==="string"&&c.samplingStratum.trim().length>=2&&
   !c.containsPersonalOrBeneficiaryRecords&&
   !c.modelAnswerExposedToReviewers;
  if(!ok){issues.push("case_provenance_or_rights_incomplete");continue}
  if(validCases.has(c.caseId))continue;
  validCases.set(c.caseId,c);countByTask[c.task]++;
 }
 if(!protocol||!HASH.test(protocol.sourceManifestSha256??"")||
  !HASH.test(protocol.analysisPlanSha256??"")||
  !validTime(protocol.lockedAt)||protocol.signedHumanPreregistration!==true||
  !simpleHttps(protocol.publicPreregistrationReceiptUrl))
  issues.push("human_signed_preregistration_and_hashes_missing");
 if(validCases.size&&validTime(protocol?.lockedAt)&&
   [...validCases.values()].some(c=>validTime(c.createdAt)&&
    new Date(c.createdAt)<new Date(protocol.lockedAt)&&c.origin!=="new_independent_licensed_holdout"))
  issues.push("pre_registration_or_selection_sequence_not_auditable");
 const qualifiedReviewers=new Map();
 for(const r of reviewers){
  if(!safeId(r?.reviewerPseudonym)||!HASH.test(r.qualificationReceiptSha256??"")||
   !r.independentFromHpiModels||r.conflictOfInterestStatus!=="cleared_by_human"||
   !r.qualificationVerifiedByHuman||!validTime(r.qualificationsVerifiedAt)){
    issues.push("reviewer_independence_or_qualification_unverified");continue;
  }
  qualifiedReviewers.set(r.reviewerPseudonym,r);
 }
 const reviewByCase=new Map();
 for(const r of reviews){
  if(!safeId(r?.caseId)||!validCases.has(r.caseId)||
   !qualifiedReviewers.has(r.reviewerPseudonym)||
   (validTime(protocol?.lockedAt)&&new Date(r.sealedAt)<=new Date(protocol.lockedAt))||
   !HASH.test(r.sealedJudgmentSha256??"")||!validTime(r.sealedAt)||
   r.blindedToModelOutputs!==true||!r.reviewedSourceIndependently){
    issues.push("invalid_or_unsealed_independent_review");continue;
  }
  if(!reviewByCase.has(r.caseId))reviewByCase.set(r.caseId,[]);
  reviewByCase.get(r.caseId).push(r);
 }
 const adjudicated=new Map(adjudications.map(x=>[x?.caseId,x]));
 let doubleReviewed=0,adjudicationComplete=0;
 for(const [id,c] of validCases){
  const rs=reviewByCase.get(id)||[];
  if(new Set(rs.map(x=>x.reviewerPseudonym)).size<2){
   issues.push("fewer_than_two_distinct_sealed_reviewers");continue;
  }
  if(new Set(rs.map(x=>x.sealedJudgmentSha256)).size<2)
   issues.push("separate_review_evidence_hashes_required");
  doubleReviewed++;
  const a=adjudicated.get(id);
  if(!a||a.humanAdjudicated!==true||!HASH.test(a.adjudicationReceiptSha256??"")||
   !validTime(a.resolvedAt)||
   rs.some(r=>new Date(r.sealedAt)>=new Date(a.resolvedAt))||
   a.unresolved===true||
   qualifiedReviewers.has(a.adjudicatorPseudonym)||
   !safeId(a.adjudicatorPseudonym)){
    issues.push("human_adjudication_receipt_missing_or_unresolved");continue;
  }
  adjudicationComplete++;
 }
 for(const task of TASKS)if(countByTask[task]<MIN_INDEPENDENT_CASES_PER_TASK)
  issues.push("insufficient_independent_"+task);
 const uniqueIssues=[...new Set(issues)];
 return {schema:"hpi_ai6_independent_intake_audit_v1",
  assessment:"internal_admin_readiness_only_not_scientific_validation",
  counts:{candidatesReceived:cases.length,eligibleWithDocumentedProvenance:validCases.size,
   distinctQualifiedReviewerPseudonyms:qualifiedReviewers.size,
   doubleReviewed,adjudicationComplete,byTask:countByTask},
  minimumPerTask:MIN_INDEPENDENT_CASES_PER_TASK,
  independentScientificValidation:false,
  publicationAuthorised:false,
  externalEvidenceVerificationStillRequired:true,
  administrativelyComplete:uniqueIssues.length===0,
  blockers:uniqueIssues,
  noPersonalReviewerDetailsReturned:true};
}
