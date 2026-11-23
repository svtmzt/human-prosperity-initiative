/**
 * HPI-AI.6-T07.3b — REAL independent original-source reproduction,
 * confined to public aggregate observations and author replication package
 * manifest. The former is descriptive arithmetic, not causal inference;
 * the latter is not experiment replication without underlying microdata.
 *
 * npm run ai:science:replicate -- plan
 * npm run ai:science:replicate -- run --allow-public-data
 */
import {readFile,mkdir,writeFile,stat,rmdir} from "node:fs/promises";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {reproduceOfficialAggregate} from
 "../research-tools/ai-assist/official-data-audit.mjs";
import {auditHarvardSnapPackage} from
 "../research-tools/ai-assist/replication-package-audit.mjs";
const DIR="qa-artifacts/ai-independent-replication";
const PLAN={
 plan:"hpi_ai6_t073b_two_independent_original_data_lanes_v1",
 lanes:[
  {source:"World Bank WDI source 2; Brazil; SI.POV.DDAY + SP.POP.TOTL",
   years:["2022","2023","2024"],
   declaredLicense:"World Bank WDI catalog CC BY 4.0",
   type:"public_aggregate_reproducible_arithmetic_not_causal_effect"},
  {source:"Harvard Dataverse DOI 10.7910/DVN/8AWKIL",
   originalStudy:"10.1093/qje/qjz013",type:"published_replication_package_manifest_only",
   licenceValidation:"CC0 required"}
 ],allowlistedPublicGETs:5,maxPrivateDataReads:0,
 publisherFullTextsDownloaded:0,rawExperimentDatasetsDownloaded:0,
 paidModelCalls:0,cloudAIModelCalls:0,
 humanApprovalNeededToPerformLawfulInternalAnalysis:false,
 AIOriginScientificPublicationAuthorised:false
};
async function run(){
 if(!process.argv.includes("--allow-public-data"))
  throw Error("Explicit --allow-public-data required");
 await mkdir(DIR,{recursive:true,mode:0o700});
 if(((await stat(DIR)).mode&0o077)!==0)
  throw Error("Private report directory is not 0700");
 const lock=join(DIR,".single-flight");
 await mkdir(lock,{mode:0o700});
 try{
  const [wdi,harvard]=await Promise.all([
   reproduceOfficialAggregate(),auditHarvardSnapPackage()
  ]);
  const report={schema:"hpi_ai6_t073b_independent_lawful_data_audit_v1",
   classification:"DESCRIPTIVE_REPRODUCIBILITY_AND_REPLICATION_FEASIBILITY_NOT_SCIENTIFIC_CAUSAL_VALIDATION",
   runAt:new Date().toISOString(),plan:PLAN,publicWorldBank:wdi,
   originalSNAPReplicationManifest:harvard,
   controls:{publicDataCalls:5,noPrivateDataTransfers:true,
    originalExperimentalDataNotAvailableInExaminedManifest:
      !harvard.publishedMicrodataPresentInPackage,
    originalSNAPStatisticalEffectsReplicated:0,
    newHpiInterventionEffectsValidated:0,noPublisherTextDownload:true,
    noDownloadedCodeExecution:true,
    paidModelCalls:0,cloudAIModelCalls:0,
    scientificPublicationAuthorised:false}
  };
  const file=join(DIR,new Date().toISOString().replace(/[:.]/g,"-")+".json");
  await writeFile(file,JSON.stringify(report,null,2)+"\n",{mode:0o600,flag:"wx"});
  console.log(JSON.stringify({status:"autonomous_public_research_evidence_processed",
   publicOfficialSeries:"World Bank WDI SI.POV.DDAY and SP.POP.TOTL, Brazil",
   results:wdi.rows.map(x=>({year:x.year,povertyRatePercent:x.ratePercent,
    population:x.reportedMidyearPopulation,
    estimatedPoorCountNotOfficial:x.estimatedPopulationBelowPovertyLine})),
   rateChange2022To2024PP:wdi.comparison.rateDifferencePercentagePoints,
   originalStudyReplicationPackage:{
    source:harvard.sourceStudyDoi,dataset:harvard.datasetDoi,
    license:harvard.publishedLicense,files:harvard.totals,
    originalExperimentActuallyReplicated:harvard.fullExperimentalReplicationExecuted,
    reason:harvard.feasibility},
   privateReport:file,publicDataRequests:5,paidModelCalls:0,
   protectedTextDownloaded:false,causalScienceIndependentlyValidated:false,
   scientificPublicationAuthorised:false},null,2));
 }finally{await rmdir(lock)}
}
const action=process.argv[2];
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(action==="plan")console.log(JSON.stringify(PLAN,null,2));
 else if(action==="run")await run().catch(e=>{
  console.error("HPI original-data reproduction refused:",e.message);process.exitCode=2;
 });
 else {console.error("Usage: npm run ai:science:replicate -- plan | run --allow-public-data");
  process.exitCode=2}
}
