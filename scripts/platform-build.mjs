/**
 * Global Prosperity Platform build step. Called from scripts/build.mjs after
 * the established pages are published. Validates the knowledge base (the build
 * fails on any contract violation), writes deterministic artifacts with
 * SHA-256 digests and publishes the four pillar experiences.
 */
import {cp,mkdir,readFile,writeFile} from "node:fs/promises";
import {loadVerifiedPlatform} from "./platform-verify.mjs";
import {buildPlatformExports,canonicalJson,compareMeasures,consistencyAudit,sha256,PLATFORM_FILES} from "../research-tools/prosperity-platform.mjs";
import {assessCandidate,weightSensitivity} from "../research-tools/opportunity-assessment.mjs";
import {benefitAccessPackage,protocolTemplateMarkdown,readinessChecklistMarkdown,syntheticFunnelAnalysis} from "../research-tools/platform-artifacts.mjs";
import {readAiConfig} from "../research-tools/ai-assist/config.mjs";
import {buildAiStatus} from "./ai-assist.mjs";
import {publishIntelligence} from "./platform-intelligence-pages.mjs";
import {publishSolutionsAndAdoption} from "./platform-solutions-pages.mjs";
import {publishSystemsLabAndHub,systemsLabResults} from "./platform-systems-pages.mjs";

export const PLATFORM_STATIC_ASSETS=Object.freeze({
 "site/platform.css":"platform.css","site/platform-explorer.js":"platform-explorer.js","site/platform-compare.js":"platform-compare.js",
 "site/systems-lab.js":"systems-lab.js","site/solutions-planner.js":"solutions-planner.js","site/adopt-readiness.js":"adopt-readiness.js",
 "research-tools/household-resilience-model.mjs":"systems-lab-model.js","research-tools/evaluation-design.mjs":"evaluation-design.js"
});

export async function buildPlatform({publish,shell,root="dist",env=process.env}){
 const {kb,warnings,raw}=await loadVerifiedPlatform();
 for(const [from,to] of Object.entries(PLATFORM_STATIC_ASSETS))await cp(from,root+"/"+to);
 await mkdir(root+"/downloads",{recursive:true});
 const ex=buildPlatformExports(kb,{rawSources:raw});
 const audit=consistencyAudit(kb);
 const assessment={method:"F0-02.5 baseline rubric preserved; vetoes separate; no score without independent or community scoring",
  candidates:kb.parsed.opportunity.candidates.map(c=>assessCandidate(c,kb.parsed.opportunity)),
  sensitivity:weightSensitivity(kb.parsed.opportunity.candidates,kb.parsed.opportunity),rankingPublished:false};
 const facts=[...kb.facts.values()],pairs=[];
 for(let i=0;i<facts.length;i++)for(let j=i+1;j<facts.length;j++)pairs.push(compareMeasures(facts[i],facts[j]));
 const optionalJson=async p=>{try{return JSON.parse(await readFile(p,"utf8"))}catch(e){if(e.code==="ENOENT")return null;throw e}};
 const aiExtras={snapshot:await optionalJson("research/ai/openrouter-free-models-snapshot.json"),policy:await optionalJson("research/ai/model-selection-policy.json"),
  evaluation:await optionalJson("research/ai/evaluation-results-v1.json")};
 const aiStatus=buildAiStatus(readAiConfig(env),aiExtras);
 const lab=kb.parsed.systemsLab;
 const labResults=systemsLabResults(lab);
 const funnel=syntheticFunnelAnalysis(kb.parsed.solutions.syntheticFunnelDemonstration);
 const outputs=[
  ["/platform-knowledge-base.json",canonicalJson(ex.knowledgeBase),"Complete knowledge base: contexts, figures, gaps, claims, mechanisms, interventions, problems, solutions, corrections"],
  ["/platform-context-facts.csv",ex.factsCsv,"Published figures with provenance, verification and rights columns"],
  ["/platform-evidence-claims.csv",ex.claimsCsv,"Evidence claims with direction, endpoint level and source"],
  ["/platform-graph-edges.csv",ex.edgesCsv,"Problem–mechanism–intervention–solution relationships"],
  ["/platform-schema.json",canonicalJson(ex.schema),"Data contract: required fields, rules and vocabularies"],
  ["/platform-comparability.json",canonicalJson({schemaVersion:"1.0",kind:"hpi_platform_comparability",rules:"same definition, unit, population unit, geography level, method, period, currency and price basis",pairs}),"Pairwise comparability verdicts for every published figure"],
  ["/platform-consistency-audit.json",canonicalJson({schemaVersion:"1.0",kind:"hpi_platform_consistency_audit",method:"deterministic_rule_based_not_ai",findings:audit}),"Deterministic consistency audit findings"],
  ["/platform-opportunity-assessment.json",canonicalJson({schemaVersion:"1.0",kind:"hpi_opportunity_assessment",...assessment}),"Opportunity assessment status (no scores, no ranking)"],
  ["/platform-ai-status.json",canonicalJson(aiStatus),"AI research-assistance runtime status"],
  ...(aiExtras.snapshot?[["/platform-ai-models.json",canonicalJson({policy:aiExtras.policy,catalogueSnapshot:aiExtras.snapshot}),"Verified free model catalogue snapshot and HPI selection policy (metadata only)"]]:[]),
  ...(aiExtras.evaluation?[["/platform-ai-evaluation.json",canonicalJson(aiExtras.evaluation),"Aggregate AI evaluation metrics (no model output)"]]:[]),
  ["/systems-lab-data.json",canonicalJson({schemaVersion:"1.0",label:"SYNTHETIC INPUTS",model:lab.models[0],parameterBounds:lab.parameterBounds,archetypes:lab.archetypes,scenarios:lab.scenarios}),"Systems Lab model inputs (synthetic)"],
  ["/systems-lab-results.json",canonicalJson(labResults),"Systems Lab scenario and sensitivity results (illustrative)"],
  ["/downloads/benefit-access-evaluation-package.json",canonicalJson(benefitAccessPackage(kb)),"Benefit-access evaluation package"],
  ["/downloads/evaluation-protocol-template.md",protocolTemplateMarkdown(kb),"Evaluation protocol template"],
  ["/downloads/adaptation-readiness-checklist.md",readinessChecklistMarkdown(kb),"Adaptation readiness checklist"]
 ];
 for(const [path,content] of outputs)await writeFile(root+path,content,"utf8");
 const manifest={schemaVersion:"1.0",kind:"hpi_platform_manifest",statement:"SHA-256 digests prove byte identity, not scientific validity.",
  sources:Object.entries(PLATFORM_FILES).map(([k,path])=>({path,sha256:sha256(raw[k]),bytes:Buffer.byteLength(raw[k])})),
  outputs:outputs.map(([path,content,description])=>({path,description,sha256:sha256(content),bytes:Buffer.byteLength(content)}))};
 await writeFile(root+"/platform-manifest.json",canonicalJson(manifest),"utf8");
 const exportsInfo={files:manifest.outputs.slice(0,9),sources:manifest.sources};
 const downloads=[
  {path:"/downloads/benefit-access-evaluation-package.json",label:"Evaluation package (JSON)",description:"Complete package with resolved evidence, context coverage, gates and synthetic demonstration."},
  {path:"/downloads/evaluation-protocol-template.md",label:"Protocol template (Markdown)",description:"Sections a qualified institution must complete before any study."},
  {path:"/downloads/adaptation-readiness-checklist.md",label:"Readiness checklist (Markdown)",description:"Nine readiness dimensions with specialist review requirements."}
 ];
 const routes=[
  ...await publishIntelligence({publish,shell,kb,audit,assessment,exportsInfo,aiStatus,aiExtras}),
  ...await publishSolutionsAndAdoption({publish,shell,kb,funnel,downloads,governanceGates:kb.governanceGates}),
  ...await publishSystemsLabAndHub({publish,shell,kb,labResults,pillarStatus:[
   "Implemented · automated tests pass · not independently reviewed · "+kb.claims.size+" claims, "+kb.facts.size+" figures, "+kb.gaps.size+" declared gaps",
   "Implemented · automated tests pass · not independently reviewed · 1 complete vertical slice, 2 templates",
   "Implemented · automated tests pass · not independently reviewed · "+kb.parsed.adoption.resources.length+" resources · 0 adopters",
   "Implemented · automated tests pass · not independently reviewed · 1 illustrative model, synthetic inputs"]})
 ];
 const unique=new Set(routes);
 if(unique.size!==routes.length)throw new Error("Platform route collision");
 return {routes,summary:{schemaVersion:kb.parsed.taxonomy.schemaVersion,contexts:kb.ctx.size,facts:kb.facts.size,gaps:kb.gaps.size,claims:kb.claims.size,
  mechanisms:kb.mechanisms.size,interventions:kb.interventions.size,problems:kb.problems.size,solutions:kb.solutions.size,
  auditFindings:audit.length,warnings:warnings.length,aiInference:aiStatus.productionInference,manifestSha256:sha256(canonicalJson(manifest))}};
}
