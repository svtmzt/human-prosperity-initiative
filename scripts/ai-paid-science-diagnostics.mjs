/**
 * Evaluate PRIVATE outputs against pre-existing INTERNALLY curated labels.
 * Produces only aggregate category counts; no excerpts or raw responses.
 * No network, credentials or model requests.
 */
import {readFile,readdir} from "node:fs/promises";
import {compareInternallyCuratedClaimLabels} from "../research-tools/ai-assist/pilot-diagnostics.mjs";
const dir="qa-artifacts/ai-paid-science-pilot";
const source=JSON.parse(await readFile("research/ai/evaluation-set-v1.json","utf8"));
const names=(await readdir(dir)).filter(f=>f.endsWith(".json")).sort();
const results=[];
let cumulativeReservedUsd=0;
for(const name of names){
 const artifact=JSON.parse(await readFile(dir+"/"+name,"utf8"));
 if(artifact.classification!=="PRIVATE_PENDING_HUMAN_REVIEW"||
  artifact.published!==false)throw new Error("Unexpected private artifact classification");
 const items=artifact.sourceIds.map(id=>source.items.find(x=>x.id===id));
 if(items.some(x=>!x))throw new Error("Unknown versioned source ID");
 const diagnostic=compareInternallyCuratedClaimLabels(items,artifact.reports);
 results.push({run:name,tier:artifact.selectedTier??"baseline_initial",
  diagnostic,externalCalls:artifact.spend.modelCallsAttempted,
  usageReportedUsd:artifact.reports.reduce((n,r)=>n+(r.report.totals.costUsdReported||0),0),
  worstCaseReservedUsd:artifact.spend.worstCaseReservedUsd});
 cumulativeReservedUsd+=artifact.spend.worstCaseReservedUsd;
}
console.log(JSON.stringify({classification:"PRIVATE_ENGINEERING_DIAGNOSTIC",
 published:false,scientificAccuracyCertified:false,
 cumulativeReservedUsd,allRuns:results},null,2));
