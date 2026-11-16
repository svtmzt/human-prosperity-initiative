/**
 * HPI Global Prosperity Platform — versioned knowledge-base contract (schema 1.0).
 *
 * Pure, deterministic functions. No network access, no participant records,
 * no AI inference. Inputs are allowlisted repository files; outputs are
 * byte-stable for identical inputs.
 *
 * The contract enforces: provenance completeness with explicit missingness,
 * referential integrity, honest labelling (hypotheses vs evidence-linked),
 * no aggregate prosperity scores or rankings, no synthesised denominators,
 * evidence-gated maturity, an empty-unless-evidenced adoption register and
 * safe text/URL content.
 */
import {createHash} from "node:crypto";

export const PLATFORM_SCHEMA_VERSION="1.0";
export const PLATFORM_FILES=Object.freeze({
 taxonomy:"research/platform/taxonomy.json",
 contexts:"research/platform/contexts.json",
 facts:"research/platform/context-facts.json",
 claims:"research/platform/evidence-claims.json",
 mechanisms:"research/platform/mechanisms.json",
 interventions:"research/platform/interventions.json",
 problems:"research/platform/problems.json",
 solutions:"research/platform/solutions.json",
 adoption:"research/platform/adoption.json",
 systemsLab:"research/platform/systems-lab.json",
 opportunity:"research/platform/opportunity-assessment.json",
 corrections:"research/platform/corrections.json"
});
const COLLECTIONS={taxonomy:"taxonomy",contexts:"contexts",facts:"context-facts",claims:"evidence-claims",
 mechanisms:"mechanisms",interventions:"interventions",problems:"problems",solutions:"solutions",
 adoption:"adoption",systemsLab:"systems-lab",opportunity:"opportunity-assessment",corrections:"corrections"};

export const ENUMS=Object.freeze({
 unit:["households","persons","residents","percent","GBP","EUR","BRL","BRL_per_person_per_month","EUR_per_household_per_month"],
 measureType:["count","rate","amount","threshold"],
 method:["administrative_model","survey_estimate","census","service_report","nowcast","composite_index","official_area_index","programme_rule","administrative_caseload"],
 geographyLevel:["global","multi_country","nation","region","metropolitan_area","municipality","local_authority"],
 populationUnit:["households","persons","benefit_units","expenditure"],
 verificationLevel:["byte_hashed_extraction","publisher_page_transcribed_unhashed","citation_level_from_ledger"],
 redistributionStatus:["permitted_with_attribution_publisher_statement","reference_only_rights_not_reviewed","unknown"],
 factReviewStatus:["internal_automated_reproducibility_check_only","internal_desk_audit","internal_desk_research","citation_level_not_full_text_verified"],
 stage:["potentially_eligible","applied","approved","received","sustained_improvement"],
 gapStatus:["not_measured","not_published","source_exists_not_extracted","not_applicable"],
 claimType:["source_reported_finding","source_reported_null","source_reported_adverse","source_reported_descriptive","insufficiently_extracted","withdrawn"],
 direction:["supports","mixed","null","adverse","descriptive"],
 mechanismStatus:["evidence_linked","candidate_hypothesis"],
 recurrenceStatus:["pathway_documented_barrier_unmeasured","risk_noted_in_hpi_desk_research","not_assessed"],
 contextRole:["global_reference","national_reference","regional_reference","evidence_case","contextual_comparator","reserve_comparator"],
 contextType:["global","country","region","metropolitan_area","municipality","local_authority"],
 correctionType:["supersession","provenance_reconciliation","retraction","correction"],
 readinessStatus:["not_assessed","not_met","partially_met","met_with_evidence","not_applicable"]
});
const ID={
 dimension:/^D[1-9]-[A-Z-]+$/,family:/^PF-[A-Z-]+$/,context:/^[A-Z]{2,6}(?:-[A-Z]+)*$/,
 programme:/^PROG-[A-Z-]+$/,fact:/^F-[A-Z0-9-]+$/,gap:/^G-[A-Z0-9-]+$/,claim:/^C-E\d{2}-\d+$/,
 mechanism:/^M-[A-Z-]+$/,intervention:/^I-[A-Z-]+$/,problem:/^P-[A-Z-]+$/,solution:/^SOL-[A-Z-]+$/,
 correction:/^COR-\d{4}-\d\d-\d\d-[A-Z0-9-]+$/,opportunity:/^OPP-[A-Z-]+$/,resource:/^RES-[A-Z-]+$/,
 archetype:/^A\d-[A-Z-]+$/,scenario:/^S\d-[A-Z-]+$/,question:/^RQ-ESL-\d\d$/,model:/^MODEL-[A-Z]+-\d\d$/,
 explanation:/^EXP-\d\d$/,veto:/^V-[A-Z-]+$/,readiness:/^R-[A-Z-]+$/,gate:/^G-0[1-9]$/
};
const FORBIDDEN_KEYS=/^(score|scores|rank|ranking|rankings|prosperityIndex|prosperityScore|compositeScore|overallScore|globalRank)$/i;
const FIRST_PARTY=/^\/(?:[a-z0-9][a-z0-9.-]*\/?)*(?:#[a-z0-9-]+)?$/;
const SHA256=/^[a-f0-9]{64}$/;
const DATE=/^\d{4}-\d\d-\d\d$/;
const MISSABLE=["publicationDate","retrievedAt","licenceEvidenceUrl","sourceSha256","sourceBytes","referencePeriod.start","referencePeriod.end"];

export const sha256=v=>createHash("sha256").update(v).digest("hex");
export const canonicalJson=v=>JSON.stringify(v,null,2)+"\n";

class Collector{
 constructor(){this.errors=[];this.warnings=[]}
 error(m){this.errors.push(m)}
 warn(m){this.warnings.push(m)}
}
const isObj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const isDate=v=>typeof v==="string"&&DATE.test(v)&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
function get(obj,path){return path.split(".").reduce((o,k)=>o==null?undefined:o[k],obj)}

export function safeUrl(value){
 if(typeof value!=="string")return false;
 if(FIRST_PARTY.test(value)&&!value.includes(".."))return true;
 let url;try{url=new URL(value)}catch{return false}
 return url.protocol==="https:"&&!url.username&&!url.password&&url.href.length<=400;
}
function walkContent(value,path,c,{allowScoreKeys=false}={}){
 if(typeof value==="string"){
  if(value.length>1500)c.error(path+": text exceeds 1500 characters");
  if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))c.error(path+": control characters are not allowed");
  if(/[<>]/.test(value))c.error(path+": angle brackets are not allowed in knowledge-base text");
  if(/javascript:|data:text\/html/i.test(value))c.error(path+": unsafe URL scheme");
  if(/^https?:\/\//i.test(value)&&!safeUrl(value))c.error(path+": URL must be HTTPS without credentials");
  return;
 }
 if(Array.isArray(value)){value.forEach((v,i)=>walkContent(v,path+"["+i+"]",c,{allowScoreKeys}));return}
 if(isObj(value))for(const [k,v] of Object.entries(value)){
  if(!allowScoreKeys&&FORBIDDEN_KEYS.test(k))c.error(path+"."+k+": aggregate scores and rankings are not permitted in the knowledge base");
  walkContent(v,path+"."+k,c,{allowScoreKeys});
 }
}
function header(doc,key,c){
 if(!isObj(doc)){c.error(key+": must be a JSON object");return false}
 if(doc.schemaVersion!==PLATFORM_SCHEMA_VERSION)c.error(key+": unsupported schemaVersion "+doc.schemaVersion);
 if(doc.collection!==COLLECTIONS[key])c.error(key+": collection must be "+COLLECTIONS[key]);
 if(!isDate(doc.reviewedAt))c.error(key+": reviewedAt must be an ISO date");
 return true;
}
function req(obj,fields,path,c){for(const f of fields)if(obj?.[f]===undefined||obj?.[f]===""||obj?.[f]===null&&!["programmeId","stage","parent","countryCode","numerator","denominator","currency","priceBasis"].includes(f))c.error(path+": missing required field "+f)}
function oneOf(v,list,path,c){if(!list.includes(v))c.error(path+": unsupported value "+JSON.stringify(v))}
function refs(list,index,path,c,kind){
 if(!Array.isArray(list)){c.error(path+": must be an array");return}
 for(const id of list)if(!index.has(id))c.error(path+": unknown "+kind+" "+id);
}

/** Parse allowlisted files. `load(path)` returns UTF-8 text. */
export async function loadPlatformSources(load){
 const raw={},parsed={};
 for(const [key,file] of Object.entries(PLATFORM_FILES)){
  raw[key]=await load(file);
  try{parsed[key]=JSON.parse(raw[key])}catch(error){throw new Error("Platform contract: "+file+" is not valid JSON ("+error.message+")")}
 }
 return {raw,parsed};
}

/**
 * Validate the knowledge base against the 1.0 contract.
 * @param parsed collections keyed as PLATFORM_FILES
 * @param refsIn {sourceCatalog, indicatorIds:Set, gateIds:Set, baselineCriteria:[{id,weightPercent}]}
 */
export function validatePlatform(parsed,{sourceCatalog,indicatorIds=new Set(),gateIds=new Set(),baselineCriteria=null}={}){
 const c=new Collector();
 for(const key of Object.keys(PLATFORM_FILES)){
  if(!parsed[key]){c.error(key+": missing collection");continue}
  header(parsed[key],key,c);
  walkContent(parsed[key],key,c,{allowScoreKeys:key==="opportunity"});
 }
 if(c.errors.length)return finish(c,null);
 const all=new Map();
 const register=(id,pattern,kind,path)=>{
  if(typeof id!=="string"||!pattern.test(id)){c.error(path+": malformed "+kind+" ID "+id);return}
  if(all.has(id))c.error(path+": duplicate ID "+id+" (also "+all.get(id)+")");
  all.set(id,kind);
 };
 const {taxonomy,contexts,facts,claims,mechanisms,interventions,problems,solutions,adoption,systemsLab,opportunity,corrections}=parsed;
 const dims=new Map(),families=new Map(),ctx=new Map(),progs=new Map(),factIx=new Map(),gapIx=new Map(),
  claimIx=new Map(),mechIx=new Map(),intIx=new Map(),probIx=new Map(),solIx=new Map();
 const catalog=new Map((sourceCatalog?.records||[]).map(r=>[r.id,r]));
 if(!catalog.size)c.error("sourceCatalog: evidence catalogue is required to validate claims");

 (taxonomy.dimensions||[]).forEach((d,i)=>{const p="taxonomy.dimensions["+i+"]";register(d.id,ID.dimension,"dimension",p);req(d,["title","summary","measurementPitfall","source"],p,c);dims.set(d.id,d)});
 (taxonomy.problemFamilies||[]).forEach((f,i)=>{const p="taxonomy.problemFamilies["+i+"]";register(f.id,ID.family,"family",p);req(f,["title","summary","pillarRole","source"],p,c);families.set(f.id,f)});
 if(dims.size!==5)c.warn("taxonomy: expected the five F0-03 draft dimensions, found "+dims.size);

 (contexts.programmes||[]).forEach((g,i)=>{
  const p="contexts.programmes["+i+"]";register(g.id,ID.programme,"programme",p);req(g,["name","administeredBy","accessModel","pathway","eligibilityNote","sources"],p,c);
  const stages=(g.pathway||[]).map(s=>s.stage);
  if(stages.join()!==ENUMS.stage.join())c.error(p+": pathway must list all five outcome stages in order");
  progs.set(g.id,g);
 });
 (contexts.items||[]).forEach((x,i)=>{const p="contexts.items["+i+"]";register(x.id,ID.context,"context",p);req(x,["name","type","role","fieldworkStatus","summary","programmes","hpiResearch"],p,c);
  oneOf(x.type,ENUMS.contextType,p+".type",c);oneOf(x.role,ENUMS.contextRole,p+".role",c);
  if(x.fieldworkStatus!=="NO_GO")c.error(p+": fieldwork cannot be authorised by the knowledge base");
  ctx.set(x.id,x)});
 for(const x of ctx.values()){
  if(x.parent!==null&&!ctx.has(x.parent))c.error("context "+x.id+": unknown parent "+x.parent);
  refs(x.programmes,progs,"context "+x.id+".programmes",c,"programme");
 }
 const ancestors=id=>{const out=[];let cur=ctx.get(id);const seen=new Set();while(cur&&cur.parent&&!seen.has(cur.parent)){seen.add(cur.parent);out.push(cur.parent);cur=ctx.get(cur.parent)}return out};
 for(const x of ctx.values())if(ancestors(x.id).includes(x.id))c.error("context "+x.id+": circular parent chain");

 // --- Context facts: provenance contract ------------------------------------
 for(const [i,f] of (facts.facts||[]).entries()){
  const p="facts["+i+"] "+(f.id||"");register(f.id,ID.fact,"fact",p);factIx.set(f.id,f);
  req(f,["contextId","label","value","unit","measureType","measureDefinitionId","populationUnit","populationDefinition","geographyLevel","referencePeriod","method","sourceOrganization","sourceUrl","sourceVersion","licence","redistributionStatus","licenceReviewStatus","transformation","verificationLevel","uncertainty","missingness","limitations","interpretationGuard","reviewStatus","provenanceRecord","missingProvenance"],p,c);
  if(!ctx.has(f.contextId))c.error(p+": unknown context "+f.contextId);
  for(const [field,list] of [["unit",ENUMS.unit],["measureType",ENUMS.measureType],["method",ENUMS.method],["geographyLevel",ENUMS.geographyLevel],["populationUnit",ENUMS.populationUnit],["verificationLevel",ENUMS.verificationLevel],["redistributionStatus",ENUMS.redistributionStatus],["reviewStatus",ENUMS.factReviewStatus]])oneOf(f[field],list,p+"."+field,c);
  if(typeof f.value!=="number"||!Number.isFinite(f.value)||f.value<0)c.error(p+": value must be a finite non-negative number");
  if(f.measureType==="rate"&&(f.unit!=="percent"||f.value>100))c.error(p+": rates must be percentages between 0 and 100");
  if(f.unit==="percent"&&f.measureType!=="rate")c.error(p+": percent unit requires measureType rate");
  if(f.measureType==="count"&&!Number.isInteger(f.value))c.error(p+": counts must be integers");
  if(["amount","threshold"].includes(f.measureType)){
   if(!/^[A-Z]{3}$/.test(f.currency||""))c.error(p+": monetary measures require an ISO currency");
   else if(!String(f.unit).startsWith(f.currency))c.error(p+": unit "+f.unit+" does not match currency "+f.currency);
   if(!f.priceBasis)c.error(p+": monetary measures require an explicit price basis");
  }else if(f.currency)c.error(p+": non-monetary measure must not declare a currency");
  if(f.stage!==null&&f.stage!==undefined){oneOf(f.stage,ENUMS.stage,p+".stage",c);if(!f.programmeId)c.error(p+": stage requires programmeId")}
  if(f.programmeId){
   if(!progs.has(f.programmeId))c.error(p+": unknown programme "+f.programmeId);
   else if(ctx.has(f.contextId)&&!ctx.get(f.contextId).programmes.includes(f.programmeId))c.error(p+": programme not registered for context");
  }
  if(!isObj(f.referencePeriod)||!f.referencePeriod.label)c.error(p+": referencePeriod.label required");
  for(const d of ["start","end"])if(f.referencePeriod?.[d]!=null&&!isDate(f.referencePeriod[d]))c.error(p+": referencePeriod."+d+" invalid date");
  for(const d of ["publicationDate","retrievedAt"])if(f[d]!=null&&!isDate(f[d]))c.error(p+": "+d+" invalid date");
  if(f.retrievedAt&&f.retrievedAt>facts.reviewedAt)c.error(p+": retrievedAt is after collection reviewedAt");
  if(f.verificationLevel==="byte_hashed_extraction"){
   if(!SHA256.test(f.sourceSha256||""))c.error(p+": byte-hashed extraction requires sourceSha256");
   if(!Number.isInteger(f.sourceBytes)||f.sourceBytes<1)c.error(p+": byte-hashed extraction requires sourceBytes");
  }else if(f.sourceSha256!=null)c.error(p+": only byte_hashed_extraction may carry a source hash");
  if(!safeUrl(f.sourceUrl)||!/^https:/.test(f.sourceUrl))c.error(p+": sourceUrl must be an HTTPS publisher URL");
  if(!safeUrl(f.provenanceRecord))c.error(p+": provenanceRecord must be first-party");
  // Explicit missingness: every null provenance field must be declared, and only those.
  const declared=new Map((Array.isArray(f.missingProvenance)?f.missingProvenance:[]).map(m=>[m.field,m.reason]));
  for(const field of MISSABLE){
   const v=get(f,field),isMissing=v===null||v===undefined;
   if(isMissing&&!declared.get(field))c.error(p+": "+field+" is missing without a declared reason");
   if(!isMissing&&declared.has(field))c.error(p+": "+field+" is present but declared missing");
  }
  for(const [field,reason] of declared){
   if(!MISSABLE.includes(field)&&!["numerator","denominator"].includes(field))c.error(p+": unknown missingProvenance field "+field);
   if(typeof reason!=="string"||reason.length<8)c.error(p+": missingProvenance."+field+" needs a meaningful reason");
  }
  if(f.denominator&&!f.denominator.factId&&f.denominator.statedBySource!==true)c.error(p+": a denominator without a source fact must be stated by the source (never synthesised)");
 }
 // Rates with numerator/denominator facts: same source, period, context and population; arithmetic consistency.
 for(const f of factIx.values()){
  if(f.measureType!=="rate"||!f.numerator?.factId||!f.denominator?.factId)continue;
  const n=factIx.get(f.numerator.factId),d=factIx.get(f.denominator.factId),p="fact "+f.id;
  if(!n||!d){c.error(p+": numerator/denominator fact not found");continue}
  const r=checkDerivable(n,d);
  if(!r.ok)c.error(p+": numerator/denominator incompatible — "+r.reasons.join("; "));
  if(n.value!==f.numerator.value||d.value!==f.denominator.value)c.error(p+": numerator/denominator values differ from referenced facts (source version change?)");
  if(r.ok){const derived=n.value/d.value*100;if(Math.abs(derived-f.value)>1)c.error(p+": stated rate "+f.value+"% inconsistent with "+n.value+"/"+d.value+" ("+derived.toFixed(1)+"%)")}
 }
 for(const [i,g] of (facts.measurementGaps||[]).entries()){
  const p="measurementGaps["+i+"]";register(g.id,ID.gap,"gap",p);gapIx.set(g.id,g);
  req(g,["contextId","programmeId","stage","status","reason","accessGate"],p,c);
  if(!ctx.has(g.contextId))c.error(p+": unknown context");if(!progs.has(g.programmeId))c.error(p+": unknown programme");
  oneOf(g.stage,ENUMS.stage,p+".stage",c);oneOf(g.status,ENUMS.gapStatus,p+".status",c);
  if(g.potentialSource!==null&&!safeUrl(g.potentialSource))c.error(p+": unsafe potentialSource");
 }
 // Facts should not be stale relative to review date (warning only).
 for(const f of factIx.values()){
  const end=f.referencePeriod?.end;
  if(end&&(Date.parse(facts.reviewedAt)-Date.parse(end))/86400000>3*365)c.warn("fact "+f.id+": reference period ended more than three years before review");
 }

 // --- Mechanisms, interventions, problems ----------------------------------
 for(const [i,m] of (mechanisms.items||[]).entries()){const p="mechanisms["+i+"]";register(m.id,ID.mechanism,"mechanism",p);mechIx.set(m.id,m);req(m,["title","familyId","status","description","openQuestions","recurrence"],p,c);
  if(!families.has(m.familyId))c.error(p+": unknown family");oneOf(m.status,ENUMS.mechanismStatus,p+".status",c);
  for(const r of m.recurrence||[]){if(!ctx.has(r.contextId))c.error(p+": recurrence context unknown "+r.contextId);oneOf(r.status,ENUMS.recurrenceStatus,p+".recurrence.status",c);if(!r.note)c.error(p+": recurrence note required")}}
 for(const [i,x] of (interventions.items||[]).entries()){const p="interventions["+i+"]";register(x.id,ID.intervention,"intervention",p);intIx.set(x.id,x);req(x,["title","familyId","mechanisms","description","hpiInterpretation","potentialHarms","costNote","contextDependence"],p,c);
  if(!families.has(x.familyId))c.error(p+": unknown family");refs(x.mechanisms,mechIx,p+".mechanisms",c,"mechanism");}
 for(const [i,x] of (problems.items||[]).entries()){const p="problems["+i+"]";register(x.id,ID.problem,"problem",p);probIx.set(x.id,x);req(x,["title","familyId","dimensions","summary","affectedPopulations","contexts","mechanisms","uncertainties","evidenceGaps","researchDocuments"],p,c);
  if(!families.has(x.familyId))c.error(p+": unknown family");refs(x.dimensions,dims,p+".dimensions",c,"dimension");refs(x.contexts,ctx,p+".contexts",c,"context");refs(x.mechanisms,mechIx,p+".mechanisms",c,"mechanism");
  for(const d of x.researchDocuments||[])if(!safeUrl(d))c.error(p+": unsafe research document link");}

 // --- Evidence claims ---------------------------------------------------------
 const seenStatements=new Set();
 if(!Array.isArray(claims.endpointLevels)||!claims.endpointLevels.length)c.error("claims: endpointLevels required");
 for(const [i,x] of (claims.items||[]).entries()){
  const p="claims["+i+"] "+(x.id||"");register(x.id,ID.claim,"claim",p);claimIx.set(x.id,x);
  req(x,["evidenceId","statement","claimType","direction","endpointLevel","mechanisms","interventions","problems","transferabilityNote"],p,c);
  const record=catalog.get(x.evidenceId);
  if(!record||record.kind!=="evidence_reference")c.error(p+": evidence "+x.evidenceId+" is not in the source catalogue");
  else{
   if(!String(x.id).startsWith("C-"+x.evidenceId+"-"))c.error(p+": claim ID must embed its evidence ID");
   if(record.retraction==="retracted"&&x.claimType!=="withdrawn")c.error(p+": evidence "+x.evidenceId+" is retracted; claim must be withdrawn");
  }
  oneOf(x.claimType,ENUMS.claimType,p+".claimType",c);oneOf(x.direction,ENUMS.direction,p+".direction",c);
  if(!(claims.endpointLevels||[]).includes(x.endpointLevel))c.error(p+": unknown endpointLevel "+x.endpointLevel);
  if(x.claimType==="source_reported_descriptive"&&x.direction!=="descriptive")c.error(p+": descriptive claims must have descriptive direction");
  if(x.claimType==="source_reported_null"&&!["null","mixed"].includes(x.direction))c.error(p+": null findings cannot be recorded as supportive");
  if(x.claimType==="source_reported_adverse"&&x.direction!=="adverse")c.error(p+": adverse findings must be recorded as adverse");
  refs(x.mechanisms,mechIx,p+".mechanisms",c,"mechanism");refs(x.interventions,intIx,p+".interventions",c,"intervention");refs(x.problems,probIx,p+".problems",c,"problem");
  const key=x.evidenceId+"|"+String(x.statement).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  if(seenStatements.has(key))c.error(p+": duplicate claim statement for "+x.evidenceId);seenStatements.add(key);
 }
 // Honest labelling: evidence-linked mechanisms need claims; hypotheses must have none.
 for(const m of mechIx.values()){
  const n=[...claimIx.values()].filter(x=>x.mechanisms.includes(m.id)&&x.claimType!=="withdrawn").length;
  if(m.status==="evidence_linked"&&n===0)c.error("mechanism "+m.id+": labelled evidence_linked but no claim is attached");
  if(m.status==="candidate_hypothesis"&&n>0)c.error("mechanism "+m.id+": has linked claims; relabel as evidence_linked after review");
 }
 for(const x of intIx.values())if(![...claimIx.values()].some(cl=>cl.interventions.includes(x.id)))c.warn("intervention "+x.id+": no linked evidence claim");

 // --- Solutions and maturity gating -------------------------------------------
 const levels=(adoption.maturityLevels||[]).map(l=>l.level);
 if(levels.join()!=="1,2,3,4,5,6,7")c.error("adoption.maturityLevels: must define levels 1 to 7 in order");
 const adoptionBySolution=new Set((adoption.adoptionRecords||[]).map(a=>a.solutionId));
 const stageIds=(solutions.outcomeStages||[]).map(s=>s.id);
 if(stageIds.join()!==ENUMS.stage.join())c.error("solutions.outcomeStages: must list the five outcome stages in order");
 for(const [i,s] of (solutions.items||[]).entries()){
  const p="solutions["+i+"] "+(s.id||"");register(s.id,ID.solution,"solution",p);solIx.set(s.id,s);
  req(s,["title","familyId","problemId","mechanisms","candidateInterventions","description","scientificRationale","existingEvidenceClaims","evidenceLimitations","contextDependencies","resourcePrerequisites","institutionalPrerequisites","potentialBenefits","potentialHarms","measurementPlan","localAdaptations","ethicalLegalGates","governanceIssues","maturity","artifacts","relatedResearch"],p,c);
  if(!families.has(s.familyId))c.error(p+": unknown family");if(!probIx.has(s.problemId))c.error(p+": unknown problem");
  refs(s.mechanisms,mechIx,p+".mechanisms",c,"mechanism");refs(s.candidateInterventions,intIx,p+".candidateInterventions",c,"intervention");refs(s.existingEvidenceClaims,claimIx,p+".existingEvidenceClaims",c,"claim");
  if(!Array.isArray(s.potentialHarms)||!s.potentialHarms.length)c.error(p+": potential harms must be stated");
  const mp=s.measurementPlan||{};
  if(!mp.primaryOutcome?.indicatorId)c.error(p+": primary outcome indicator required");
  else if(indicatorIds.size&&!indicatorIds.has(mp.primaryOutcome.indicatorId))c.error(p+": primary indicator not in F0-03 catalogue");
  for(const o of mp.secondaryOutcomes||[])if(indicatorIds.size&&!indicatorIds.has(o.indicatorId))c.error(p+": secondary indicator not in F0-03 catalogue "+o.indicatorId);
  if(s.familyId==="PF-BENEFIT-ACCESS"&&mp.primaryOutcome?.stage!=="received")c.error(p+": benefit-access primary outcome must be verified receipt, not applications");
  for(const k of ["comparisonRequirement","missingData","causalInference","sampleSize"])if(!mp[k])c.error(p+": measurementPlan."+k+" required");
  for(const g of s.ethicalLegalGates||[])if(gateIds.size&&!gateIds.has(g))c.error(p+": unknown governance gate "+g);
  for(const a of s.localAdaptations||[]){
   const ap=p+".localAdaptations "+a.contextId;
   if(!ctx.has(a.contextId)){c.error(ap+": unknown context");continue}
   if(!progs.has(a.programmeId))c.error(ap+": unknown programme");
   const scope=new Set([a.contextId,...ancestors(a.contextId)]);
   for(const fid of a.availableMeasures||[]){const f=factIx.get(fid);if(!f)c.error(ap+": unknown fact "+fid);else if(!scope.has(f.contextId))c.error(ap+": fact "+fid+" belongs to another context")}
   for(const gid of a.missingMeasures||[]){const g=gapIx.get(gid);if(!g)c.error(ap+": unknown gap "+gid);else if(g.contextId!==a.contextId)c.error(ap+": gap "+gid+" belongs to another context")}
   for(const g of a.legalAndDataGates||[])if(gateIds.size&&!gateIds.has(g))c.error(ap+": unknown gate "+g);
   if(!a.transferabilityLimits?.length)c.error(ap+": transferability limits required");
  }
  const mat=s.maturity||{};
  if(!Number.isInteger(mat.level)||mat.level<1||mat.level>7)c.error(p+": maturity level must be 1-7");
  else{
   const ev=new Map((mat.evidence||[]).map(e=>[e.level,e]));
   for(let l=1;l<=mat.level;l++){const e=ev.get(l);if(!e||!safeUrl(e.url)||!e.note)c.error(p+": maturity level "+l+" lacks recorded evidence")}
   for(const e of mat.evidence||[])if(e.level>mat.level)c.error(p+": evidence recorded above the awarded level");
   if(mat.level>=5){const e=ev.get(5);if(!e||e.independent!==true||!/^https:/.test(e.url))c.error(p+": level 5+ requires an independent external evaluation URL")}
   if(mat.level>=7&&!adoptionBySolution.has(s.id))c.error(p+": level 7 requires a verified adoption record");
   if(mat.level<7&&(!mat.blockedNextLevel||mat.blockedNextLevel.level!==mat.level+1||!mat.blockedNextLevel.missing?.length))c.error(p+": blockedNextLevel must name what is missing for the next level");
  }
  for(const u of [...(s.artifacts||[]),...(s.relatedResearch||[])])if(!safeUrl(u))c.error(p+": unsafe artifact link "+u);
 }
 const demo=solutions.syntheticFunnelDemonstration;
 if(demo){
  if(demo.label!=="SYNTHETIC ONLY")c.error("solutions.syntheticFunnelDemonstration: must be labelled SYNTHETIC ONLY");
  for(const [name,g] of Object.entries(demo.groups||{})){
   const seq=[g.eligible,g.applied,g.approved,g.received];
   if(seq.some(v=>!Number.isInteger(v)||v<0))c.error("synthetic group "+name+": counts must be non-negative integers");
   for(let k=1;k<seq.length;k++)if(seq[k]>seq[k-1])c.error("synthetic group "+name+": later funnel stage exceeds earlier stage");
   if(!Number.isInteger(g.missingFollowup)||g.missingFollowup>g.eligible-g.received)c.error("synthetic group "+name+": invalid missing follow-up");
  }
 }

 // --- Adoption: no fabricated adoption, partnerships or usage ---------------
 for(const [i,r] of (adoption.readinessDimensions||[]).entries()){register(r.id,ID.readiness,"readiness",'adoption.readinessDimensions['+i+']');if(!r.questions?.length||!r.specialistReview)c.error("readiness "+r.id+": questions and specialist review required")}
 if(JSON.stringify(adoption.readinessStatuses)!==JSON.stringify(ENUMS.readinessStatus))c.error("adoption.readinessStatuses: unexpected status vocabulary");
 for(const [i,r] of (adoption.resources||[]).entries()){const p="adoption.resources["+i+"]";register(r.id,ID.resource,"resource",p);req(r,["title","type","url","licence","audience","prerequisites","maturityLevel"],p,c);
  if(!FIRST_PARTY.test(r.url))c.error(p+": downloadable resources must be first-party");
  if(r.maturityLevel>4)c.error(p+": resources cannot claim independent evaluation or adoption");}
 for(const key of ["adoptionRecords","partnerships"]){
  if(!Array.isArray(adoption[key])){c.error("adoption."+key+": must be an array");continue}
  for(const [i,a] of adoption[key].entries()){
   const p="adoption."+key+"["+i+"]";
   if(!a.organisation||!/^https:/.test(a.evidenceUrl||"")||!isDate(a.verifiedAt)||!a.verifiedBy||/hpi|self/i.test(a.verifiedBy))c.error(p+": requires organisation, public HTTPS evidence, verification date and a verifier independent of HPI");
   if(key==="adoptionRecords"&&!solIx.has(a.solutionId))c.error(p+": unknown solution");
  }
 }
 for(const k of ["usageCount","downloads","adopters","testimonials"])if(adoption[k]!==undefined)c.error("adoption."+k+": usage statistics and testimonials are not recorded");

 // --- Systems Lab ------------------------------------------------------------
 const bounds=systemsLab.parameterBounds||{};
 for(const [i,a] of (systemsLab.archetypes||[]).entries()){
  const p="systemsLab.archetypes["+i+"]";register(a.id,ID.archetype,"archetype",p);
  if(a.synthetic!==true)c.error(p+": archetypes must be explicitly synthetic");
  for(const k of ["transfers","housing","energy","food","otherEssentials","savings"])if(typeof a[k]!=="number"||a[k]<0||!Number.isFinite(a[k]))c.error(p+": "+k+" must be non-negative");
  if(!(a.effectiveTaxRate>=0&&a.effectiveTaxRate<1))c.error(p+": effectiveTaxRate must be in [0,1)");
  for(const e of a.earners||[]){if(!(e.hourlyWage>=0&&e.monthlyHours>=0&&e.monthlyHours<=744))c.error(p+": invalid earner");if(!(e.employmentShare>=0&&e.employmentShare<=1&&e.automationExposure>=0&&e.automationExposure<=1))c.error(p+": shares must be in [0,1]")}
 }
 for(const [i,s] of (systemsLab.scenarios||[]).entries()){
  const p="systemsLab.scenarios["+i+"]";register(s.id,ID.scenario,"scenario",p);
  for(const [k,v] of Object.entries(s.parameters||{})){
   if(!bounds[k])c.error(p+": unknown parameter "+k);
   else if(typeof v!=="number"||v<bounds[k][0]||v>bounds[k][1])c.error(p+": "+k+" outside declared bounds");
  }
 }
 for(const [i,q] of (systemsLab.researchQuestions||[]).entries())register(q.id,ID.question,"question","systemsLab.researchQuestions["+i+"]");
 for(const [i,x] of (systemsLab.competingExplanations||[]).entries()){register(x.id,ID.explanation,"explanation","systemsLab.competingExplanations["+i+"]");if(!x.testableImplication||!x.measurementCaveat)c.error("explanation "+x.id+": testable implication and caveat required")}
 for(const [i,m] of (systemsLab.models||[]).entries()){
  register(m.id,ID.model,"model","systemsLab.models["+i+"]");
  if(!/illustrative/.test(m.status))c.error("model "+m.id+": status must disclose that the model is illustrative");
  if(!m.assumptions?.length||!m.limitations?.length||!m.formulas?.length)c.error("model "+m.id+": formulas, assumptions and limitations are required");
 }

 // --- Opportunity assessment ---------------------------------------------------
 const rubric=opportunity.baselineRubric?.criteria||[];
 const total=rubric.reduce((n,x)=>n+x.weightPercent,0);
 if(total!==100)c.error("opportunity: baseline weights must total 100");
 if(baselineCriteria){
  const a=rubric.map(x=>x.id+":"+x.weightPercent).join(),b=baselineCriteria.map(x=>x.id+":"+x.weightPercent).join();
  if(a!==b)c.error("opportunity: baseline rubric must preserve the F0-02.5 criteria and weights exactly");
 }
 const vetoIds=new Set();
 for(const [i,v] of (opportunity.vetoes||[]).entries()){register(v.id,ID.veto,"veto","opportunity.vetoes["+i+"]");vetoIds.add(v.id)}
 for(const [i,o] of (opportunity.candidates||[]).entries()){
  const p="opportunity.candidates["+i+"]";register(o.id,ID.opportunity,"opportunity",p);
  refs(o.contextIds,ctx,p+".contextIds",c,"context");if(!probIx.has(o.problemId))c.error(p+": unknown problem");
  const covered=(o.criterionScores||[]).map(s=>s.criterionId).sort().join();
  if(covered!==rubric.map(x=>x.id).sort().join())c.error(p+": every baseline criterion must be listed (scored or explicitly null)");
  for(const s of o.criterionScores||[]){
   if(s.score===null){if(s.scorerType!==null)c.error(p+": unscored criterion cannot name a scorer")}
   else{
    if(typeof s.score!=="number"||s.score<opportunity.baselineRubric.scale.min||s.score>opportunity.baselineRubric.scale.max)c.error(p+": score outside scale");
    if(!(opportunity.acceptedScorerTypes||[]).includes(s.scorerType))c.error(p+": scores require an independent or community scorer");
   }
  }
  const vs=new Set((o.vetoStatus||[]).map(v=>v.vetoId));
  for(const v of vetoIds)if(!vs.has(v))c.error(p+": veto "+v+" status missing");
 }

 // --- Corrections ---------------------------------------------------------------
 for(const [i,x] of (corrections.items||[]).entries()){
  const p="corrections["+i+"]";register(x.id,ID.correction,"correction",p);
  if(!isDate(x.date))c.error(p+": invalid date");oneOf(x.type,ENUMS.correctionType,p+".type",c);
  for(const id of x.affectedEntityIds||[])if(!all.has(id)&&!catalog.has(id))c.error(p+": unknown affected entity "+id);
  for(const d of x.affectedDocuments||[])if(!FIRST_PARTY.test(d))c.error(p+": affected documents must be first-party");
  if(x.type==="retraction"){
   const affected=x.affectedEntityIds||[];
   for(const cl of claimIx.values())if(affected.includes(cl.evidenceId)&&cl.claimType!=="withdrawn")c.error(p+": claim "+cl.id+" still relies on retracted evidence "+cl.evidenceId);
  }
 }
 if(c.errors.length)return finish(c,null);
 const kb={parsed,dims,families,ctx,progs,facts:factIx,gaps:gapIx,claims:claimIx,mechanisms:mechIx,interventions:intIx,problems:probIx,solutions:solIx,catalog};
 kb.graph=buildKnowledgeGraph(kb);
 // Every outcome stage of every local adaptation must be measured or a declared gap.
 for(const s of solIx.values())for(const a of s.localAdaptations||[])
  for(const row of stageCoverage(kb,a.contextId,a.programmeId))
   if(row.status==="not_recorded")c.error("solution "+s.id+" adaptation "+a.contextId+": stage "+row.stage+" has neither a published measure nor a declared gap");
 return finish(c,kb);
}
function finish(c,kb){
 if(c.errors.length){
  const error=new Error("Platform contract: "+c.errors.length+" violation(s)\n - "+c.errors.slice(0,40).join("\n - "));
  error.violations=c.errors;throw error;
 }
 return {kb,warnings:c.warnings};
}

/** Reverse indexes for navigation. Pure and deterministic (input order preserved). */
export function buildKnowledgeGraph(kb){
 const push=(map,key,val)=>{if(!map.has(key))map.set(key,[]);if(!map.get(key).includes(val))map.get(key).push(val)};
 const g={claimsByMechanism:new Map(),claimsByIntervention:new Map(),claimsByProblem:new Map(),claimsByEvidence:new Map(),
  interventionsByMechanism:new Map(),problemsByMechanism:new Map(),solutionsByMechanism:new Map(),solutionsByProblem:new Map(),
  factsByContext:new Map(),gapsByContext:new Map(),childrenByContext:new Map(),problemsByContext:new Map(),edges:[]};
 for(const cl of kb.claims.values()){
  push(g.claimsByEvidence,cl.evidenceId,cl.id);
  for(const m of cl.mechanisms){push(g.claimsByMechanism,m,cl.id);g.edges.push(["evidence_claim",cl.id,"mechanism",m,cl.direction])}
  for(const i of cl.interventions){push(g.claimsByIntervention,i,cl.id);g.edges.push(["evidence_claim",cl.id,"intervention",i,cl.direction])}
  for(const p of cl.problems)push(g.claimsByProblem,p,cl.id);
 }
 for(const x of kb.interventions.values())for(const m of x.mechanisms){push(g.interventionsByMechanism,m,x.id);g.edges.push(["mechanism",m,"intervention",x.id,"targeted_by"])}
 for(const p of kb.problems.values()){
  for(const m of p.mechanisms){push(g.problemsByMechanism,m,p.id);g.edges.push(["problem",p.id,"mechanism",m,"explained_by"])}
  for(const c of p.contexts)push(g.problemsByContext,c,p.id);
 }
 for(const s of kb.solutions.values()){
  push(g.solutionsByProblem,s.problemId,s.id);
  for(const m of s.mechanisms){push(g.solutionsByMechanism,m,s.id);g.edges.push(["mechanism",m,"solution",s.id,"addressed_by"])}
 }
 for(const f of kb.facts.values())push(g.factsByContext,f.contextId,f.id);
 for(const x of kb.gaps.values())push(g.gapsByContext,x.contextId,x.id);
 for(const x of kb.ctx.values())if(x.parent)push(g.childrenByContext,x.parent,x.id);
 return g;
}

/**
 * Measure comparability. Two facts are directly comparable only when they
 * share definition, unit, population unit, geography level, method,
 * reference period and price basis. Every difference is explained.
 */
export function compareMeasures(a,b){
 const reasons=[];
 const check=(dimension,va,vb,explanation)=>{if(JSON.stringify(va)!==JSON.stringify(vb))reasons.push({dimension,a:va,b:vb,explanation})};
 check("measure definition",a.measureDefinitionId,b.measureDefinitionId,"Different statistics measure different things, even when both are percentages.");
 check("unit",a.unit,b.unit,"Units differ.");
 check("population unit",a.populationUnit,b.populationUnit,"Households, persons, benefit units and expenditure are not interchangeable denominators.");
 check("geography level",a.geographyLevel,b.geographyLevel,"Different geographic levels cannot be compared without a documented bridge.");
 check("method",a.method,b.method,"Survey estimates, administrative models, service reports and indices have different error structures.");
 check("reference period",a.referencePeriod?.label,b.referencePeriod?.label,"Different reference periods.");
 check("currency",a.currency??null,b.currency??null,"Different currencies require a documented price and purchasing-power method.");
 check("price basis",a.priceBasis??null,b.priceBasis??null,"Different price bases.");
 return {comparable:reasons.length===0,factA:a.id,factB:b.id,reasons};
}
/** Whether a rate can be derived from two facts without synthesising a denominator. */
export function checkDerivable(numerator,denominator){
 const reasons=[];
 if(numerator.measureType!=="count"||denominator.measureType!=="count")reasons.push("both inputs must be counts");
 if(numerator.contextId!==denominator.contextId)reasons.push("different contexts");
 if(numerator.sourceUrl!==denominator.sourceUrl)reasons.push("different sources");
 if(numerator.referencePeriod?.label!==denominator.referencePeriod?.label)reasons.push("different reference periods");
 if(numerator.populationUnit!==denominator.populationUnit)reasons.push("different population units");
 if(numerator.unit!==denominator.unit)reasons.push("different units");
 if(denominator.value<=0)reasons.push("denominator must be positive");
 if(numerator.value>denominator.value)reasons.push("numerator exceeds denominator");
 return {ok:reasons.length===0,reasons};
}
export function deriveRate(numerator,denominator){
 const check=checkDerivable(numerator,denominator);
 if(!check.ok)return {derived:false,value:null,reasons:check.reasons};
 return {derived:true,value:Math.round(numerator.value/denominator.value*1000)/10,unit:"percent",
  derivation:numerator.id+" / "+denominator.id,reasons:[]};
}
/** All pairwise comparability verdicts among rate facts (deterministic order). */
export function rateComparabilityMatrix(kb){
 const rates=[...kb.facts.values()].filter(f=>f.measureType==="rate");
 const out=[];
 for(let i=0;i<rates.length;i++)for(let j=i+1;j<rates.length;j++)out.push(compareMeasures(rates[i],rates[j]));
 return out;
}

/** Per-context outcome-stage coverage for a programme: fact, gap or unrecorded. */
export function stageCoverage(kb,contextId,programmeId){
 const scope=c=>{const out=[c];let cur=kb.ctx.get(c);while(cur?.parent){out.push(cur.parent);cur=kb.ctx.get(cur.parent)}return out};
 const own=new Set([contextId]);
 const inScope=new Set(scope(contextId));
 return ENUMS.stage.map(stage=>{
  const local=[...kb.facts.values()].filter(f=>own.has(f.contextId)&&f.programmeId===programmeId&&f.stage===stage);
  const wider=[...kb.facts.values()].filter(f=>!own.has(f.contextId)&&inScope.has(f.contextId)&&f.programmeId===programmeId&&f.stage===stage);
  const gaps=[...kb.gaps.values()].filter(g=>g.contextId===contextId&&g.programmeId===programmeId&&g.stage===stage);
  return {stage,localFacts:local.map(f=>f.id),widerGeographyFacts:wider.map(f=>f.id),gaps:gaps.map(g=>g.id),
   status:local.length?"local_published_measure":wider.length?"only_wider_geography":gaps.length?"documented_gap":"not_recorded"};
 });
}

/**
 * Deterministic, non-AI consistency audit: heterogeneous or conflicting
 * evidence, intermediate-only endpoints, non-independent studies, older
 * evidence, hypotheses without evidence and unverified provenance.
 */
export function consistencyAudit(kb,{reviewedAt=kb.parsed.claims.reviewedAt}={}){
 const findings=[];
 const add=(type,severity,entityId,message,ids=[])=>findings.push({type,severity,entityId,message,relatedIds:ids});
 const dirs=ids=>new Set(ids.map(id=>kb.claims.get(id).direction));
 for(const [kind,index] of [["mechanism",kb.graph.claimsByMechanism],["intervention",kb.graph.claimsByIntervention]]){
  for(const [id,ids] of index){
   const d=dirs(ids);
   if(d.has("supports")&&(d.has("null")||d.has("adverse")))add("conflicting_evidence","caution",id,"Linked "+kind+" evidence includes both supportive and null or adverse findings; context and endpoint must be examined before any conclusion.",ids);
  }
 }
 for(const x of kb.interventions.values()){
  if(x.familyId!=="PF-BENEFIT-ACCESS")continue;
  const ids=kb.graph.claimsByIntervention.get(x.id)||[];
  const levels=new Set(ids.map(id=>kb.claims.get(id).endpointLevel));
  if(ids.length&&!levels.has("receipt")&&!levels.has("approval"))add("intermediate_endpoint_only","caution",x.id,"All linked evidence measures interest or applications only; effect on verified receipt is unknown.",ids);
 }
 const families=new Map();
 for(const r of kb.catalog.values())if(r.studyFamily&&r.kind==="evidence_reference"){if(!families.has(r.studyFamily))families.set(r.studyFamily,[]);families.get(r.studyFamily).push(r.id)}
 for(const [family,ids] of families)if(ids.length>1)add("non_independent_studies","info",family,"Records share study family '"+family+"'; they are overlapping or follow-up evidence and must not be counted as independent replications.",ids);
 const dois=new Map();
 for(const r of kb.catalog.values())if(r.doi){const k=r.doi.toLowerCase();if(!dois.has(k))dois.set(k,[]);dois.get(k).push(r.id)}
 for(const [doi,ids] of dois)if(ids.length>1)add("duplicate_reference","caution",doi,"Duplicate DOI across catalogue records.",ids);
 const reviewYear=Number(String(reviewedAt).slice(0,4));
 const old=[...kb.claims.values()].map(x=>kb.catalog.get(x.evidenceId)).filter(r=>r&&reviewYear-Number(r.year)>10);
 for(const r of [...new Map(old.map(r=>[r.id,r])).values()])add("older_evidence","info",r.id,"Published "+r.year+"; more than ten years before review. Check for newer evidence and changed contexts.",[r.id]);
 for(const m of kb.mechanisms.values())if(m.status==="candidate_hypothesis")add("hypothesis_without_evidence","info",m.id,"Candidate hypothesis with no linked evidence claim yet.",[]);
 const abstractOnly=[...kb.claims.values()].filter(x=>/abstract/.test(kb.catalog.get(x.evidenceId)?.extractionDepth||"")).length;
 add("abstract_level_extraction","info","claims",abstractOnly+" of "+kb.claims.size+" claims rest on abstract or summary-level extraction; none has full-text dual review.",[]);
 const notChecked=[...new Set([...kb.claims.values()].map(x=>x.evidenceId))].filter(id=>kb.catalog.get(id)?.retraction==="not_checked").length;
 add("retraction_not_checked","info","claims","Retraction status not checked for "+notChecked+" referenced studies.",[]);
 const unhashed=[...kb.facts.values()].filter(f=>f.verificationLevel!=="byte_hashed_extraction").map(f=>f.id);
 add("unhashed_facts","info","facts",unhashed.length+" of "+kb.facts.size+" context facts are transcribed without a source-file hash.",unhashed);
 const order={caution:0,info:1};
 return findings.sort((a,b)=>order[a.severity]-order[b.severity]||a.type.localeCompare(b.type)||a.entityId.localeCompare(b.entityId));
}

// --- Deterministic exports ------------------------------------------------------
export function csvCell(value){
 let s=value===null||value===undefined?"":Array.isArray(value)?value.join("; "):String(value);
 if(/^[=+\-@\t\r]/.test(s)&&!/^-?\d+(\.\d+)?$/.test(s))s="'"+s; // spreadsheet formula-injection guard
 return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
}
const csv=(head,rows)=>[head.join(","),...rows.map(r=>head.map(h=>csvCell(r[h])).join(","))].join("\n")+"\n";

export function buildPlatformExports(kb,{rawSources}={}){
 const claims=[...kb.claims.values()].map(x=>{
  const r=kb.catalog.get(x.evidenceId);
  return {...x,evidence:{id:r.id,year:r.year,geography:r.geography,design:r.titleOrType,sourceUrl:r.sourceUrl,doi:r.doi,
   extractionDepth:r.extractionDepth,formalRiskOfBias:r.formalRiskOfBias,retraction:r.retraction,studyFamily:r.studyFamily}};
 });
 const p=kb.parsed;
 const knowledgeBase={
  schemaVersion:PLATFORM_SCHEMA_VERSION,kind:"hpi_global_prosperity_knowledge_base",
  statement:"Desk-research knowledge base. Not an impact assessment, not a ranking, not individual eligibility advice. Third-party figures are attributed citations and retain their owners' rights.",
  sourceDigests:rawSources?Object.fromEntries(Object.entries(PLATFORM_FILES).map(([k,f])=>[f,sha256(rawSources[k])])):null,
  dimensions:p.taxonomy.dimensions,problemFamilies:p.taxonomy.problemFamilies,
  contexts:p.contexts.items,programmes:p.contexts.programmes,
  facts:p.facts.facts,measurementGaps:p.facts.measurementGaps,
  claims,mechanisms:p.mechanisms.items,interventions:p.interventions.items,problems:p.problems.items,
  solutions:p.solutions.items,corrections:p.corrections.items,
  adoptionRecords:p.adoption.adoptionRecords,partnerships:p.adoption.partnerships
 };
 const factHead=["id","contextId","programmeId","stage","label","value","unit","measureType","measureDefinitionId","populationUnit","geographyLevel","referencePeriod","method","sourceOrganization","sourceUrl","publicationDate","retrievedAt","licence","redistributionStatus","verificationLevel","sourceSha256","uncertainty","limitations","interpretationGuard","reviewStatus"];
 const factsCsv=csv(factHead,p.facts.facts.map(f=>({...f,referencePeriod:f.referencePeriod.label})));
 const claimHead=["id","evidenceId","year","studyGeography","design","sourceUrl","statement","claimType","direction","endpointLevel","mechanisms","interventions","extractionDepth","retraction","transferabilityNote"];
 const claimsCsv=csv(claimHead,claims.map(x=>({...x,year:x.evidence.year,studyGeography:x.evidence.geography,design:x.evidence.design,sourceUrl:x.evidence.sourceUrl,extractionDepth:x.evidence.extractionDepth,retraction:x.evidence.retraction})));
 const edgesCsv=csv(["fromType","fromId","toType","toId","relation"],kb.graph.edges.map(([fromType,fromId,toType,toId,relation])=>({fromType,fromId,toType,toId,relation})));
 const schema={
  schemaVersion:PLATFORM_SCHEMA_VERSION,kind:"hpi_platform_data_contract",
  entities:{
   fact:{required:["id","contextId","label","value","unit","measureType","measureDefinitionId","populationUnit","populationDefinition","geographyLevel","referencePeriod","method","sourceOrganization","sourceUrl","sourceVersion","licence","redistributionStatus","licenceReviewStatus","transformation","verificationLevel","uncertainty","missingness","limitations","interpretationGuard","reviewStatus","provenanceRecord","missingProvenance"],
    explicitMissingness:MISSABLE,rules:["Rates are percentages 0-100","Counts are integers","Monetary measures declare ISO currency and price basis","Byte-hashed extractions carry SHA-256 and byte length","Denominators are never synthesised","Numerator/denominator facts must share source, context, period and population unit"]},
   claim:{required:["id","evidenceId","statement","claimType","direction","endpointLevel","mechanisms","interventions","problems","transferabilityNote"],rules:["Evidence must exist in the HPI source catalogue","Retracted evidence must be withdrawn","Null and adverse findings cannot be recorded as supportive"]},
   mechanism:{required:["id","title","familyId","status","description","openQuestions","recurrence"],rules:["evidence_linked requires at least one claim","candidate_hypothesis must have no claims"]},
   solution:{required:["id","problemId","mechanisms","measurementPlan","localAdaptations","ethicalLegalGates","maturity"],rules:["Maturity requires recorded evidence for every level","Level 5+ requires independent external evaluation","Level 7 requires a verified adoption record","Benefit-access primary outcome is verified receipt"]},
   adoptionRecord:{required:["organisation","solutionId","evidenceUrl","verifiedAt","verifiedBy"],rules:["Verifier must be independent of HPI","No usage counts or testimonials"]}
  },
  enums:ENUMS,
  prohibited:["Aggregate prosperity scores","Global rankings","Synthesised denominators","Personal or beneficiary records","HTML in text fields"]
 };
 return {knowledgeBase,factsCsv,claimsCsv,edgesCsv,schema};
}
