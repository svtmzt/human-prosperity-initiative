import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {
 auditPublisherDepositedAbstract,enforceAbstractIntegrityGate,
 compareAgentClaimsWithOriginalAbstract
} from "../research-tools/ai-assist/original-abstract-audit.mjs";

const snapDoi="10.1093/qje/qjz013";
const eitcDoi="10.1257/pol.20200603";
// Synthetic fixtures, NOT reproduced publisher abstracts.
const snapAbstract="<jats:abstract><jats:p>A randomized field experiment enrolled 30,000 elderly individuals. "+
 "Only 6% of the control group enrolls in SNAP over the next nine months, compared to "+
 "11% of the Information Only group and 18% of the Information Plus Assistance group. "+
 "Potential welfare implications are uncertain.</jats:p></jats:abstract>";
const eitcAbstract="<jats:p>We ran six preregistered, large-scale field experiments with "+
 "1 million observations. Across messages, we find no evidence that they affected "+
 "households’ likelihood of filing a tax return or claiming the credit.</jats:p>";
const snapSummary="SNAP enrolment: 6% control; 11% information; 18% help over nine months";
const eitcSummary="No detectable change in filing or claiming, despite 1 million observations";
const sha=x=>createHash("sha256").update(x).digest("hex");
const snap=()=>auditPublisherDepositedAbstract({
 doi:snapDoi,summaryText:snapSummary,abstractXml:snapAbstract});
const eitc=()=>auditPublisherDepositedAbstract({
 doi:eitcDoi,summaryText:eitcSummary,abstractXml:eitcAbstract});
const sourceRecord=(id,doi,audit)=>({
 itemId:id,doi,identityConfirmedByTwoCatalogues:true,abstractClaimAudit:audit});
const registry=(a=snap(),b=eitc())=>({
 schema:"hpi_t072_primary_metadata_evidence_v1",
 items:[sourceRecord("claim:E08",snapDoi,a),sourceRecord("claim:E13",eitcDoi,b)]});
const outcomes=()=>[{
 itemId:"claim:E08",status:"recheck_converged_pending_primary_verification",
 models:[{model:"qwen4b",coarseLabels:["E08|receipt|supports"],flags:[]},
  {model:"qwen9b",coarseLabels:["E08|sustained_participation|supports"],flags:[]}],
 critic:{valid:true,verdict:"supported",flags:[]},
 nextAction:"verify_primary_publication",publishable:false},{
 itemId:"claim:E13",status:"unresolved_after_autonomous_recheck",
 models:[{model:"qwen4b",coarseLabels:["E13|receipt|null"],flags:[]},
  {model:"qwen9b",coarseLabels:[],flags:[]}],
 critic:{valid:true,verdict:"supported",flags:[]},
 nextAction:"autonomous_primary_source_retrieval_and_method_challenge",
 publishable:false
}];
test("original source rate arithmetic is not re-estimation of an RCT",()=>{
 const a=snap();
 assert.equal(a.available,true);
 assert.equal(a.sample.count,30000);
 assert.equal(a.sample.unit,"individuals");
 assert.equal(a.followUp.months,9);
 assert.equal(a.design.randomisedFieldExperiment,true);
 assert.equal(a.outcome,"snap_enrolment");
 assert.deepEqual(a.labelledRateGroups.map(x=>[x.group,x.ratePercent]),[
  ["control",6],["information_only",11],["information_plus_assistance",18]]);
 assert.deepEqual(a.derivedComparisons.comparisons.map(x=>x.absoluteDifferencePercentagePoints),[5,12]);
 assert.deepEqual(a.derivedComparisons.comparisons.map(x=>x.relativeRateRatio),[1.83333,3]);
 assert.equal(a.derivedComparisons.confidenceIntervalFromAbstract,null);
 assert.equal(a.derivedComparisons.comparisons.every(x=>x.statisticalSignificanceTested===false),true);
 assert.equal(a.empiricalEffectScientificallyVerified,false);
 assert.equal(a.primaryFindingScientificallyValidated,false);
 assert.equal(a.rawPublisherTextRetained,false);
 assert.equal(JSON.stringify(a).includes("Potential welfare implications are uncertain."),false);
 assert.equal(a.depositedAbstractSha256,sha(snapAbstract));
});
test("null evidence is not necessarily an effect exactly equal to zero",()=>{
 const a=eitc();
 assert.equal(a.design.preregisteredFieldExperiments,true);
 assert.equal(a.design.experimentCount,6);
 assert.equal(a.sample.count,1000000);
 assert.equal(a.sample.unit,"observations_not_unique_individuals");
 assert.equal(a.outcome,"tax_filing_and_eitc_claiming");
 assert.equal(a.nullEffectReport.reportedDirection,"authors_report_no_evidence_of_detectable_effect");
 assert.equal(a.nullEffectReport.notExactZeroEffect,true);
 assert.equal(a.nullEffectReport.noEffectSizeEstimatedFromAbstract,true);
 assert.equal(a.derivedComparisons.computable,false);
 assert.equal(a.primaryFindingScientificallyValidated,false);
});
test("missing original abstract never implies scientific clearance",()=>{
 for(const v of [null,undefined,"","<jats:p>short</jats:p>",
  "<!DOCTYPE x><p>"+"r".repeat(100)+"</p>"]){
  const a=auditPublisherDepositedAbstract({doi:snapDoi,abstractXml:v});
  assert.equal(a.available,false);
  assert.equal(a.primaryFindingScientificallyValidated,false);
  assert.equal(a.rawPublisherTextRetained,false);
 }
});
test("null reversal in HPI summary fails before any model runs",()=>{
 const a=auditPublisherDepositedAbstract({doi:eitcDoi,abstractXml:eitcAbstract,
  summaryText:"Nudge increased claiming EITC by 23%"});
 assert.equal(a.seriousSummaryContradictionDetected,true);
 assert.ok(a.contradictionCodes.includes("summary_reverses_null_report"));
 assert.throws(()=>enforceAbstractIntegrityGate(registry(snap(),a),
  [{id:"claim:E08"},{id:"claim:E13"}]),/contradicts/);
});
test("original publisher text never appears in an audit result",()=>{
 const text=snapAbstract.replace("Potential welfare implications are uncertain.","SENSITIVE_LICENSED_TEST_PASSAGE_ABC");
 const a=auditPublisherDepositedAbstract({doi:snapDoi,abstractXml:text,
  summaryText:snapSummary});
 assert.equal(JSON.stringify(a).includes("SENSITIVE_LICENSED_TEST_PASSAGE_ABC"),false);
 assert.equal(a.rightsToStoreOrSendFullTextEstablished,false);
 assert.equal(a.originalStudyFullTextRead,false);
 assert.equal(a.scientificMethodReproductionPerformed,false);
});
test("wrong published group rate is flagged, despite plausible other numbers",()=>{
 const a=auditPublisherDepositedAbstract({doi:snapDoi,abstractXml:snapAbstract,
  summaryText:"16% of the control group enrolls in SNAP, vs 11% and 18%"});
 assert.equal(a.seriousSummaryContradictionDetected,true);
 assert.ok(a.contradictionCodes.includes("summary_misstates_labelled_group_rate"));
});
test("early unsupported endpoint remains flagged after AI recheck",()=>{
 const d=compareAgentClaimsWithOriginalAbstract({
  record:registry(),decision:{outcomes:outcomes(),candidateCount:1,
   unresolvedCount:1}});
 assert.equal(d.outcomes[0].status,"source_candidate_with_original_abstract_endpoint_dispute");
 assert.equal(d.outcomes[0].originalAbstractAudit.contradictionCodes[0].code,
  "original_abstract_does_not_measure_sustained_participation");
 assert.equal(d.outcomes[1].originalAbstractAudit.contradictionCodes[0].code,
  "claiming_tax_credit_not_equivalent_to_receiving_payment");
 assert.equal(d.outcomes[0].originalAbstractAudit.rateComparisons.length,2);
 assert.equal(d.outcomes[1].originalAbstractAudit.authorsNullReportNotExactZero,true);
 assert.equal(d.sourceAuditLevel,"original_publisher_deposited_abstract_not_full_study");
 assert.equal(d.abstractArithmeticChecks,2);
 assert.equal(d.originalResultsReproducedFromRawData,0);
 assert.equal(d.publishable,false);
});
test("AI reversal of original reported null effect is quarantined",()=>{
 const reversed=outcomes();
 reversed[1].models[0].coarseLabels=["E13|receipt|supports"];
 const d=compareAgentClaimsWithOriginalAbstract({record:registry(),
  decision:{outcomes:reversed}});
 assert.equal(d.outcomes[1].status,"quarantined_original_abstract_null_reversal");
 assert.ok(d.outcomes[1].originalAbstractAudit.contradictionCodes.some(x=>
  x.code==="model_reverses_original_reported_null_result"));
 assert.equal(d.outcomes[1].publishable,false);
 assert.equal(d.independentScientificValidation,false);
});
test("missing, uncorroborated or contradictory primary records fail closed",()=>{
 assert.throws(()=>enforceAbstractIntegrityGate(registry(),[{id:"claim:E88"}]),
  /missing/);
 const broken=registry();broken.items[0].identityConfirmedByTwoCatalogues=false;
 assert.throws(()=>compareAgentClaimsWithOriginalAbstract({record:broken,
  decision:{outcomes:outcomes()}}),/No independently corroborated/);
});
