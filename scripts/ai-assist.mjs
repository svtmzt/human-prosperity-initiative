/**
 * HPI AI research-assistance CLI.
 *
 *   npm run ai:status                       provider state (no network)
 *   npm run ai:baseline                     deterministic non-AI source profiles
 *   npm run ai:extract -- --ids E04,E12     claim extraction for HUMAN REVIEW
 *
 * Extraction requires HPI_AI_PROVIDER=openai_compatible plus HPI_AI_BASE_URL and
 * HPI_AI_MODEL (see docs/platform/ai-research-assistance-v1.md). Output goes to
 * qa-artifacts/ai-review-queue/ (git-ignored) and is never published.
 */
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {readAiConfig,describeAiConfig} from "../research-tools/ai-assist/config.mjs";
import {createOpenAiCompatibleProvider} from "../research-tools/ai-assist/providers.mjs";
import {runClaimExtraction,deterministicSourceProfile} from "../research-tools/ai-assist/assistant.mjs";
import {promptFingerprint} from "../research-tools/ai-assist/safeguards.mjs";
import {parseCsv} from "./site-content.mjs";
import {loadVerifiedPlatform} from "./platform-verify.mjs";

export async function evidenceSourceTexts(load=p=>readFile(p,"utf8")){
 const toObjects=csv=>{const [head,...rows]=parseCsv(csv);return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]])))};
 const ledger=toObjects(await load("research/evidence-ledger.csv"));
 const structured=new Map(toObjects(await load("research/F0-02-structured-evidence-2026-11-06.csv")).map(r=>[r.source_id,r]));
 return ledger.map(r=>{const s=structured.get(r.id);
  return {id:r.id,url:r.url,structured:s||null,
   text:[r.key_finding,s?.finding_verified_from_abstract_or_summary,s?.measured_endpoint?"Measured endpoint: "+s.measured_endpoint:"","Limitations: "+r.limitations].filter(Boolean).join(" ")}});
}
export function buildAiStatus(config){
 return {schemaVersion:"1.0",kind:"hpi_ai_research_assistance_status",
  productionInference:config.available,configuration:describeAiConfig(config),
  publishedAiGeneratedContent:0,
  statement:config.available?"An inference provider is configured for this build. AI output is still never published without human review.":
   "No inference provider is connected. The website contains no AI-generated analysis. Deterministic, rule-based consistency checks are published instead and labelled as non-AI.",
  promptTemplates:[promptFingerprint("claim-extraction"),promptFingerprint("source-classification")],
  safeguards:["Source text is treated as untrusted data and delimited","Prompt-injection screening quarantines suspicious sources before any request","Schema-constrained JSON output validation","Verbatim quote check against the cited source","Abstention accepted; unsupported claims rejected","Recommendation, eligibility and certainty language rejected","Request and input-size ceilings per run","Known paid hosts refused without a recorded approval reference","Outputs labelled ai_generated_hypothesis and pending_human_review","Review queue written only to git-ignored local artifacts"],
  prohibitedUses:["Certifying research validity","Approving interventions","Decisions about individuals","Publishing model output as evidence"]};
}
async function main(){
 const [command="status",...rest]=process.argv.slice(2);
 const config=readAiConfig(process.env);
 if(command==="status"){console.log(JSON.stringify(buildAiStatus(config),null,2));return}
 const {kb}=await loadVerifiedPlatform();
 const sources=await evidenceSourceTexts();
 if(command==="baseline"){
  const profiles=sources.map(s=>deterministicSourceProfile(kb.catalog.get(s.id),s.structured));
  console.log(JSON.stringify({method:"deterministic_rule_based",ai:false,profiles},null,2));return;
 }
 if(command==="extract"){
  const ids=(rest[rest.indexOf("--ids")+1]||"").split(",").filter(Boolean);
  const selected=ids.length?sources.filter(s=>ids.includes(s.id)):sources;
  const provider=createOpenAiCompatibleProvider(config,{apiKey:process.env.HPI_AI_API_KEY});
  const report=await runClaimExtraction({sources:selected,provider,config,
   knownMechanismIds:[...kb.mechanisms.keys()],endpointLevels:kb.parsed.claims.endpointLevels});
  await mkdir("qa-artifacts/ai-review-queue",{recursive:true});
  const file="qa-artifacts/ai-review-queue/claims-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";
  await writeFile(file,JSON.stringify(report,null,2)+"\n");
  console.log("AI extraction status:",report.status,"| queued for human review:",report.queue.length,"| quarantined:",report.quarantined.length,"| failures:",report.failures.length,"→",file);
  if(!["completed_pending_human_review","partial_pending_human_review"].includes(report.status))process.exitCode=2;
  return;
 }
 console.error("Unknown command. Use status | baseline | extract");process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
