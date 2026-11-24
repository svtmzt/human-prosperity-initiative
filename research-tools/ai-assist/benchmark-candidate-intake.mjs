/** Private source-grounded engineering candidates, never independent gold.
 * Study groups cross task boundaries. Keep them together in any future split. */
import {createHash} from "node:crypto";
import {SCIENTIFIC_TASKS} from "./scientific-validation.mjs";
import {canonicalDoi} from "./primary-provenance.mjs";
import {scanForInjection} from "./safeguards.mjs";
import {classifySource,checkRouting} from "./policy.mjs";
const digest=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
export function inspectCandidateBatch({pack,provenance,existing,ledger=""}){
 if(pack?.schema!=="hpi_scientific_engineering_candidate_batch_v1"||
 pack.status!=="private_candidate_not_independent_gold"||
 pack.independentlyAdjudicated!==false||pack.eligibleForProductionScience!==false||
 pack.cloudSubmissionApproved!==false||pack.referenceAnswersExcludedFromInference!==true||
 !Array.isArray(pack.items)||!pack.items.length||pack.items.length>100||
 digest(pack.items)!==pack.sha256)throw Error("Candidate batch scope or digest mismatch");
 if(provenance?.independentScientificValidation!==false||!Array.isArray(provenance.records)||
 !Array.isArray(existing?.items))throw Error("Missing provenance or prior benchmark");
 const known=new Set(existing.items.flatMap(x=>x.sources.map(s=>s.url)));
 const oldIds=new Set(existing.items.map(x=>x.id));
 const seen=new Set(),sourceGroup=new Map(),doiGroups=new Map();
 const counts=Object.fromEntries(SCIENTIFIC_TASKS.map(t=>[t,0]));
 for(const x of pack.items){
  if(!SCIENTIFIC_TASKS.includes(x.task)||typeof x.id!=="string"||seen.has(x.id)||oldIds.has(x.id)||
   !x.reference||!Array.isArray(x.sources)||x.sources.length!==(x.task==="contradiction-detection"?2:1))
   throw Error("Invalid or duplicated candidate case");
  seen.add(x.id);counts[x.task]++;
  for(const s of x.sources){
   if(known.has(s.url)||typeof s.studyGroup!=="string"||!s.studyGroup||
    typeof s.locator!=="string"||s.locator.length<8||typeof s.text!=="string"||
    s.text.length<40||s.text.length>3000||scanForInjection(s.text).length||
    s.dataClass!=="public_research_metadata"||classifySource(s).dataClass!=="public_research_metadata"||
    !checkRouting({dataClass:"public_research_metadata",boundary:"local"}).allowed)
    throw Error("Source safety, novelty or traceability refused");
   const doi=canonicalDoi(s.url);
   if(doi){
    if(ledger.toLowerCase().includes(doi)||[...known].some(u=>canonicalDoi(u)===doi))throw Error("Existing DOI is not a new candidate");
    const records=provenance.records.filter(r=>r.doi===doi);
    const r=records[0];
    if(records.length!==1||r.identity!==true||r.flags?.length!==0||
     !["crossref","openalex"].every(k=>r.registries?.[k]?.status==="ok"&&/^[a-f0-9]{64}$/.test(r.registries[k].metadataSha256??"")))
     throw Error("DOI provenance refused");
    if(doiGroups.has(doi)&&doiGroups.get(doi)!==s.studyGroup)throw Error("Study split leakage");
    doiGroups.set(doi,s.studyGroup);
   }else if(!/^https:\/\/www\.gov\.uk\/government\/statistics\//.test(s.url))throw Error("Unsupported official source");
   if(sourceGroup.has(s.url)&&sourceGroup.get(s.url)!==s.studyGroup)throw Error("Source group mismatch");
   sourceGroup.set(s.url,s.studyGroup);
  }
 }
 const groups=new Set(sourceGroup.values());
 if(groups.size!==pack.sourceStudyGroups)throw Error("Study group count mismatch");
 return {classification:"PRIVATE_CANDIDATE_INTAKE_ONLY",cases:pack.items.length,counts,
  sourceGroups:groups.size,newDoiIdentities:doiGroups.size,sha256:pack.sha256,
  // No input rows, references or raw sources are printed by intake.
  sourceFactsIndependentlyAdjudicated:false,independentScientificValidation:false,
  cloudExecutionAuthorised:false,publishable:false,
  remainingToTarget:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,Math.max(0,100-v)])),
  warning:"Study groups must stay in one partition; cross-study links need connected-component grouping. No held-out accuracy claim."};
}
