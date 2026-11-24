/** An explicitly enabled empirical reproduction lane, separate from the AI's
 * E08/E13 verdicts. Only a fixed local script runs; its output is projected
 * onto a closed aggregate schema. No prompts or raw observations cross it. */
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {fileURLToPath} from "node:url";
import {isAbsolute} from "node:path";
const execute=promisify(execFile);
const script=fileURLToPath(new URL("../../scripts/ai-trial-reproduction.py",import.meta.url));
export const TRIAL_DOI="https://doi.org/10.1257/0002828042002561";
const REV="be3dc62dd51954975085c7520fd5967226a195b1";
const SHA={
 "DESCRIPTION":"3c22555f2ac0f0e9626f1d23e7bbdcfb1b3746197b21cc461e73099e87d5a699",
 "LICENSE.md":"dd52d263a14c3d030fd2ddc39dc174eb22038ed1921bc98736992db0f98ce105",
 "data/resume.rda":"faf8da55c741deea1f5d31e0bfbea16b11b969dd1d8b34e439dee58f6c23c078"
};
const near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<1e-10;
export function projectTrialEvidence(raw){
 const r=raw?.result;
 const a=r?.arms;
 const valid=raw?.schema==="hpi_ai6_t073b2_trial_reproduction_v1"&&
 raw.source_study===TRIAL_DOI&&raw.source_version===REV&&
 raw.teaching_dataset==="https://github.com/OpenIntroStat/openintro/tree/"+REV&&
 Object.entries(SHA).every(([k,v])=>raw.source_sha256?.[k]===v)&&
 raw.table1_rounded_statistics_match===true&&raw.derived_teaching_release_used===true&&
 raw.original_author_archive_directly_retrieved===false&&
 raw.private_rows_retained===false&&raw.raw_data_sent_to_models===false&&
 raw.public_source_gets===3&&raw.paid_ai_calls===0&&
 r?.observations===4870&&r.advertisement_clusters===1323&&
 r.balanced_within_advertisement===true&&r.independent_grouped_contrast_cross_check===true&&
 r.cluster_size_distribution?.["2"]===211&&r.cluster_size_distribution?.["4"]===1112&&
 a?.white?.n===2435&&a.white.callbacks===235&&
 a?.black?.n===2435&&a.black.callbacks===157&&
 near(a.white.rate,235/2435)&&near(a.black.rate,157/2435)&&
 near(r.difference,78/2435)&&near(r.risk_ratio,235/157)&&
 near(r.cluster_robust_cr1_se,0.006194531864838007)&&
 Array.isArray(r.normal_approximation_95_ci)&&r.normal_approximation_95_ci.length===2&&
 near(r.normal_approximation_95_ci[0],r.difference-1.959963984540054*r.cluster_robust_cr1_se)&&
 near(r.normal_approximation_95_ci[1],r.difference+1.959963984540054*r.cluster_robust_cr1_se)&&
 near(r.normal_approximation_two_sided_p,2.3265755804035535e-7)&&
 r.full_original_analysis_replicated===false&&r.actual_person_race_inferred===false&&
 r.publication_authorised===false;
 if(!valid)throw Error("Trial evidence schema, scope or numerical cross-check failed");
 return {classification:"SEPARATE_EMPIRICAL_BENCHMARK_NOT_SNAP_EITC_VALIDATION",
  studyDoi:TRIAL_DOI,sourceVersion:REV,sourceSha256:{...SHA},
  sourceType:"version_pinned_documented_teaching_release",
  endpoint:"callback_for_fictitious_resume",observations:4870,clusters:1323,
  counts:{whiteNameSignal:{n:2435,callbacks:235},blackNameSignal:{n:2435,callbacks:157}},
  difference:r.difference,rateRatio:r.risk_ratio,clusterRobustSE:r.cluster_robust_cr1_se,
  approximate95CI:[...r.normal_approximation_95_ci],approximateP:r.normal_approximation_two_sided_p,
  table1RoundedStatisticsMatch:true,independentFormulaAgreement:true,
  originalStudyFullReplication:false,rawRowsRetained:false,rawRowsSentToModels:false,
  publicReadOnlyRequests:3,paidModelCalls:0,
  unrelatedToOriginalClaimVerdicts:true,canOverrideClaimVerdicts:false,
  scientificPublicationAuthorised:false};
}
export async function runTrialEvidenceLane({python=process.env.HPI_TRIAL_PYTHON??"python3",run=execute}={}){
 if(python!=="python3"&&!isAbsolute(python))throw Error("Use python3 or an absolute trusted local interpreter");
 // Fixed argv, no shell, bounded stdout and time. Never forward stderr or
 // the untrusted child JSON to the language-model prompts.
 const {stdout}=await run(python,[script,"run","--allow-public-data"],{
  shell:false,timeout:90000,maxBuffer:32768,encoding:"utf8"});
 return projectTrialEvidence(JSON.parse(stdout));
}
