/**
 * Verify the Global Prosperity Platform knowledge base (schema 1.0):
 * contract validation, referential integrity, deterministic exports and
 * the deterministic consistency audit. Offline; reads repository files only.
 */
import {readFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {buildSourceCatalog} from "../research-tools/source-catalog.mjs";
import {parseCsv} from "./site-content.mjs";
import {loadPlatformSources,validatePlatform,buildPlatformExports,consistencyAudit,canonicalJson,sha256} from "../research-tools/prosperity-platform.mjs";

export async function loadVerifiedPlatform({load=p=>readFile(p,"utf8")}={}){
 const sourceCatalog=buildSourceCatalog({
  ledgerCsv:await load("research/evidence-ledger.csv"),
  structuredCsv:await load("research/F0-02-structured-evidence-2026-11-06.csv"),
  registry:JSON.parse(await load("research/public-dataset-registry.json"))
 });
 const indicatorRows=parseCsv(await load("research/F0-03-indicator-catalog-v0.1.csv"));
 const indicatorIds=new Set(indicatorRows.slice(1).map(r=>r[0]));
 const governance=JSON.parse(await load("research/research-governance-gates.json"));
 const gateIds=new Set(governance.decisionGates.map(g=>g.id));
 const register=JSON.parse(await load("research/newham-prepilot-decision-register-v0.1.json"));
 const baselineCriteria=register.criteria.map(x=>({id:x.id,weightPercent:x.weightPercent}));
 const {raw,parsed}=await loadPlatformSources(load);
 const {kb,warnings}=validatePlatform(parsed,{sourceCatalog,indicatorIds,gateIds,baselineCriteria});
 kb.governanceGates=governance.decisionGates;
 return {kb,warnings,raw,sourceCatalog};
}

async function main(){
 const {kb,warnings,raw}=await loadVerifiedPlatform();
 const first=buildPlatformExports(kb,{rawSources:raw});
 const second=buildPlatformExports(kb,{rawSources:raw});
 const bytes=x=>canonicalJson(x.knowledgeBase)+x.factsCsv+x.claimsCsv+x.edgesCsv+canonicalJson(x.schema);
 if(sha256(bytes(first))!==sha256(bytes(second)))throw new Error("Platform exports are not deterministic");
 const audit=consistencyAudit(kb);
 console.log("HPI platform knowledge base valid:",JSON.stringify({
  contexts:kb.ctx.size,facts:kb.facts.size,gaps:kb.gaps.size,claims:kb.claims.size,
  mechanisms:kb.mechanisms.size,interventions:kb.interventions.size,problems:kb.problems.size,
  solutions:kb.solutions.size,auditFindings:audit.length,warnings:warnings.length,
  exportSha256:sha256(bytes(first)).slice(0,16)
 }));
 for(const w of warnings)console.log("warning:",w);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
