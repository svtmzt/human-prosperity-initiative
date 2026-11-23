/**
 * HPI-AI.6-T07.2 — autonomous primary PUBLIC bibliographic metadata verification.
 *
 * Strictly pinned, unauthenticated read-only Crossref + OpenAlex endpoints.
 * Metadata verifies registration/bibliography, NEVER the empirical claims.
 * No publisher full-text download, crawler, arbitrary URL fetch, model call,
 * rights assertion, personal data, or scientific publication in this module.
 */
import {createHash} from "node:crypto";
import {screenPersonalData} from "./policy.mjs";
import {auditPublisherDepositedAbstract} from "./original-abstract-audit.mjs";

const sha=x=>createHash("sha256").update(x).digest("hex");
const DOI_RE=/^10\.\d{4,9}\/[A-Za-z0-9._;()/:+-]{1,170}$/i;
const DOINOT_ALLOWED=/[?#%@\s\\<>]/;
const CROSSREF="https://api.crossref.org";
const OPENALEX="https://api.openalex.org";
const MAX_BODY=450_000;
export const PRIMARY_MAX_ITEMS=3;
export const DISCOVERY_MAX_CANDIDATES=2;
export const PROVIDER_METADATA_NOTICE="Bibliographic records are not original empirical result validation.";
const validTime=x=>typeof x==="string"&&!Number.isNaN(Date.parse(x));

export function canonicalDoi(sourceUrl){
 if(typeof sourceUrl!=="string"||sourceUrl.length>250)return null;
 let url;
 try{url=new URL(sourceUrl)}catch{return null}
 if(url.protocol!=="https:"||url.hostname!=="doi.org"||url.username||url.password||
  url.search||url.hash||url.port||url.pathname.startsWith("//"))return null;
 let decoded;
 try{decoded=decodeURIComponent(url.pathname.slice(1))}catch{return null}
 if(DOINOT_ALLOWED.test(decoded)||!DOI_RE.test(decoded)||decoded.includes(".."))return null;
 return decoded.toLowerCase();
}
export function doiLinks(doi){
 if(typeof doi!=="string"||!DOI_RE.test(doi)||DOINOT_ALLOWED.test(doi))throw Error("Invalid DOI");
 return {
  doi:"https://doi.org/"+doi.toLowerCase(),
  crossref:CROSSREF+"/works/"+encodeURIComponent(doi.toLowerCase()),
  openalex:OPENALEX+"/works/"+encodeURIComponent("https://doi.org/"+doi.toLowerCase())
 };
}
const validHttps=s=>{
 try{const u=new URL(s);return u.protocol==="https:"&&!u.username&&!u.password&&
  !u.port&&u.hostname.includes(".")&&u.hostname.length<150&&s.length<450}
 catch{return false}
};
const str=(x,max=240)=>typeof x==="string"?x.replace(/\s+/g," ").trim().slice(0,max):"";
const yearFromParts=o=>{
 const p=o?.["date-parts"]?.[0]??o?.["date-time"]?.slice?.(0,4);
 const n=Array.isArray(p)?p[0]:Number(p);
 return Number.isInteger(n)&&n>=1700&&n<=2100?n:null;
};
const titleTokens=s=>new Set(str(s,450).toLowerCase().normalize("NFKD")
 .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ")
 .split(/\s+/).filter(x=>x.length>2));
export function titleSimilarity(a,b){
 const t1=titleTokens(a),t2=titleTokens(b);
 if(!t1.size||!t2.size)return 0;
 const common=[...t1].filter(x=>t2.has(x)).length;
 return common/Math.max(t1.size,t2.size);
}
function licensingHint(url){
 if(!validHttps(url))return {label:"unrecognised_or_missing",textReuseApproved:false};
 const u=new URL(url);
 const p=u.pathname.toLowerCase(),host=u.hostname.toLowerCase();
 if(host==="creativecommons.org"&&/^\/licenses\/by\/(?:4\.0|3\.0)\/?$/.test(p))
  return {label:"crossref_cc_by_declaration",textReuseApproved:false};
 if(host==="creativecommons.org"&&/^\/licenses\/by-(?:nc|nc-sa|sa|nd|nc-nd)\//.test(p))
  return {label:"crossref_restricted_creative_commons_declaration",textReuseApproved:false};
 return {label:"publisher_or_unknown_terms",textReuseApproved:false};
}
const licenseSlug=x=>{
 const value=typeof x==="string"?x.trim().toLowerCase():"";
 return /^[a-z0-9-]{1,30}$/.test(value)?value:null;
};
function metadataLicense({crossref,openalex}){
 const refs=(Array.isArray(crossref?.license)?crossref.license:[]).slice(0,8).map(x=>({
  url:validHttps(x.URL)?x.URL:null,
  contentVersion:str(x["content-version"],30)||null,
  ...licensingHint(x.URL)
 }));
 const best=openalex?.best_oa_location;
 const primary=openalex?.primary_location;
 const oaSource=best?.source?.display_name??null;
 const oaLicense=licenseSlug(best?.license);
 const primaryLicense=licenseSlug(primary?.license);
 const restricted=/^cc-by-(?:nc|nc-sa|nd|nc-nd)$/.test(oaLicense??"");
 return {
  crossrefDeclarations:refs,
  publisherVersionLicenseSlug:primaryLicense,
  bestOpenCopyLicenseSlug:oaLicense,
  bestOpenCopyIsOA:best?.is_oa===true,
  bestOpenCopyType:str(best?.source?.type,35)||null,
  bestOpenCopySource:str(oaSource,100)||null,
  bestOpenCopyMayBeDifferentVersion:best?.landing_page_url!==primary?.landing_page_url,
  bestOpenCopyHasRestrictedTerms:restricted,
  grantToDownloadPublisherFullText:false,
  grantToFeedThirdPartyPublisherTextToCloud:false,
  grantToRepublishPublisherText:false,
  rightsStatus:"METADATA_ONLY_OR_VERSION_SPECIFIC_RIGHTS_UNVERIFIED",
  rightsNote:"Crossref/OpenAlex descriptions are signals, not verified permissions for this exact content/version. An OA or repository copy does not grant publisher full-text reuse."
 };
}
/** No user-supplied host/path: reads are pinned to these two registries. */
export async function readRegistryJson(url,{fetchImpl=globalThis.fetch,timeoutMs=12000}={}){
 const u=new URL(url);
 if(u.protocol!=="https:"||![CROSSREF,OPENALEX].includes(u.origin)||
   u.username||u.password||u.hash||url.length>600||
   (u.origin===CROSSREF&&!/^\/works(?:\/|$)/.test(u.pathname))||
   (u.origin===OPENALEX&&!/^\/works\//.test(u.pathname)))
  throw Error("Source registry URL refused");
 let res;
 try{res=await fetchImpl(url,{method:"GET",redirect:"error",
  headers:{accept:"application/json","user-agent":"HPI-AI-scientific-provenance/0.2 (+https://human-prosperity-initiative.vercel.app)"},
  signal:AbortSignal.timeout(timeoutMs)})}
 catch(e){return {ok:false,reason:e?.name==="TimeoutError"?"timeout":"network_unavailable"}}
 if(!res?.ok)return {ok:false,reason:"http_"+String(res?.status??"unavailable")};
 if(!/application\/json/i.test(res.headers?.get?.("content-type")??""))
  return {ok:false,reason:"unexpected_content_type"};
 const declared=Number(res.headers.get("content-length")||0);
 if(Number.isFinite(declared)&&declared>MAX_BODY)return {ok:false,reason:"metadata_too_large"};
 if(!res.body?.getReader)return {ok:false,reason:"unreadable_response_body"};
 const chunks=[];let size=0,reader=res.body.getReader();
 try{
  for(;;){
   const {value,done}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>MAX_BODY){await reader.cancel();return {ok:false,reason:"metadata_too_large"}}
   chunks.push(value);
  }
  const all=new Uint8Array(size);let off=0;
  for(const c of chunks){all.set(c,off);off+=c.byteLength}
  const raw=new TextDecoder("utf-8",{fatal:true}).decode(all);
  return {ok:true,data:JSON.parse(raw),bytes:size,
   retrievedMetadataSha256:sha(raw)};
 }catch{return {ok:false,reason:"malformed_or_unreadable_json"}}
 finally{reader.releaseLock()}
}
export function normalizeCrossrefRecord(record,expectedDoi){
 if(!record||canonicalDoi("https://doi.org/"+String(record.DOI||""))!==expectedDoi)
  return null;
 const title=str(record.title?.[0],350);
 if(!title||!str(record.publisher)||!str(record.type))return null;
 const year=yearFromParts(record.published)||yearFromParts(record.issued);
 return {doi:expectedDoi,title,publisher:str(record.publisher,140),
  journal:str(record["container-title"]?.[0],180)||null,type:str(record.type,60),
  publicationYear:year,publishedDateParts:record.published?.["date-parts"]?.[0]??null,
  metadataLicense:record.license??[],abstractDeposited:Boolean(record.abstract),
  hasPublisherFullTextLinks:Array.isArray(record.link)&&record.link.length>0,
  updateRelationCount:Object.keys(record.relation??{}).length,
  hasCorrectionOrRetractionIndicators:Array.isArray(record["update-to"])&&record["update-to"].length>0};
}
export function normalizeOpenAlexRecord(record,expectedDoi){
 if(!record||canonicalDoi(String(record.doi||""))!==expectedDoi)return null;
 const title=str(record.title||record.display_name,350);
 if(!title)return null;
 return {doi:expectedDoi,title,publicationYear:Number.isInteger(record.publication_year)?
  record.publication_year:null,openalexId:str(record.id,110)||null,
  isRetracted:record.is_retracted===true,
  licenseSignal:{
   primaryLocation:record.primary_location??null,
   bestOpenAccessLocation:record.best_oa_location??null,
   oaStatus:str(record.open_access?.oa_status,30)||null}
 };
}
/** Deterministic percentage-token overlap with Crossref's deposited abstract.
 * Compute IN MEMORY: never copy/save any deposited abstract content. Numbers
 * in the same abstract do not prove which outcome or comparison they belong to.
 */
export function depositedAbstractPercentageSignal(summaryText,abstractText){
 const tokens=x=>[...new Set((String(x??"").match(/(?<![A-Za-z0-9])\d+(?:[.,]\d+)?\s?%/g)||[])
  .map(v=>v.replace(/\s/g,"").replace(",",".")))];
 const summary=tokens(summaryText),deposited=new Set(tokens(abstractText));
 return {summaryPercentageTokens:summary.length,
  foundInDepositedAbstract:summary.filter(v=>deposited.has(v)).length,
  depositedAbstractPresent:typeof abstractText==="string"&&abstractText.length>0,
  level:"weak_token_presence_only_not_effect_or_direction_confirmation",
  abstractTextStored:false,scientificClaimVerified:false};
}
export function adjudicateBibliographicIdentity({
 doi,crossrefRaw,openalexRaw,retrievedAt,registries={},summaryText=""
}={}){
 const c=normalizeCrossrefRecord(crossrefRaw,doi);
 const a=normalizeOpenAlexRecord(openalexRaw,doi);
 const similarity=c&&a?titleSimilarity(c.title,a.title):0;
 const yearDiscrepancy=c?.publicationYear&&a?.publicationYear?
  Math.abs(c.publicationYear-a.publicationYear):null;
 const flags=[];
 if(!c)flags.push("crossref_identity_or_record_missing");
 if(!a)flags.push("openalex_identity_or_record_missing");
 if(c&&a&&similarity<0.78)flags.push("bibliographic_title_conflict");
 if(yearDiscrepancy!==null&&yearDiscrepancy>1)flags.push("publication_year_conflict");
 if(c?.hasCorrectionOrRetractionIndicators||a?.isRetracted)
  flags.push("possible_correction_or_retraction");
 const bothConfirmed=flags.length===0;
 return {doi,canonicalUrl:"https://doi.org/"+doi,
  status:bothConfirmed?"bibliographic_identity_corroborated":"bibliographic_identity_unresolved",
  identityConfirmedByTwoCatalogues:bothConfirmed,
  originalEmpiricalFindingVerified:false,
  crossref:c?{title:c.title,publisher:c.publisher,journal:c.journal,
   type:c.type,publicationYear:c.publicationYear,abstractDeposited:c.abstractDeposited,
   hasPublisherFullTextLinks:c.hasPublisherFullTextLinks,
   correctionIndicators:c.hasCorrectionOrRetractionIndicators}:null,
  openalex:a?{title:a.title,publicationYear:a.publicationYear,
   openalexId:a.openalexId,isRetracted:a.isRetracted,
   oaStatus:a.licenseSignal.oaStatus}:null,
  titleAgreementRatio:Number(similarity.toFixed(3)),
  abstractNumericalSignal:depositedAbstractPercentageSignal(summaryText,crossrefRaw?.abstract),
  abstractClaimAudit:auditPublisherDepositedAbstract({doi,summaryText,
   abstractXml:crossrefRaw?.abstract}),
  registries,flags,rights:metadataLicense({
   crossref:crossrefRaw,
   openalex:openalexRaw
  }),retrievedAt,
  candidateNextAction:bothConfirmed?
   "retrieve_licensed_original_abstract_or_fulltext_for_quantitative_verification":
   "quarantine_source_until_metadata_registration_resolved",
  independentScientificValidation:false,publicationAuthorised:false};
}
export async function verifyDoi(doi,{fetchImpl=globalThis.fetch,
  now=()=>new Date().toISOString(),summaryText=""}={}){
 const links=doiLinks(doi);
 const [cr,oa]=await Promise.all([
  readRegistryJson(links.crossref,{fetchImpl}),
  readRegistryJson(links.openalex,{fetchImpl})
 ]);
 return adjudicateBibliographicIdentity({
  doi,retrievedAt:now(),summaryText,
  crossrefRaw:cr.ok?cr.data?.message:null,
  openalexRaw:oa.ok?oa.data:null,
  registries:{
   crossref:{status:cr.ok?"ok":cr.reason,
    metadataSha256:cr.retrievedMetadataSha256??null,endpoint:links.crossref},
   openalex:{status:oa.ok?"ok":oa.reason,
    metadataSha256:oa.retrievedMetadataSha256??null,endpoint:links.openalex}
  }
 });
}
/**
 * Safe, fail-closed verification for an existing HPI source set.
 * Only DOI URLs are supported. Non-DOI publisher/PMC references remain
 * not-verified, without fetching an arbitrary URL.
 */
export async function verifyPrimaryRecords({items,fetchImpl=globalThis.fetch,
  now=()=>new Date().toISOString()}={}){
 if(!Array.isArray(items)||!items.length||items.length>PRIMARY_MAX_ITEMS)
  throw Error("Primary verification requires 1-3 items");
 const findings=[],seen=new Map();
 for(const item of items){
  if(!Array.isArray(item.sources)||item.sources.length!==1||
   typeof item.id!=="string"||item.sources[0].dataClass!=="public_research_metadata"||
   screenPersonalData(item.sources[0].text).length)
   throw Error("Unsafe source provenance request");
  const doi=canonicalDoi(item.sources[0].url);
  if(!doi){findings.push({itemId:item.id,sourceId:item.sources[0].id,
   doi:null,status:"non_doi_source_requires_dedicated_adapter",
   originalEmpiricalFindingVerified:false,independentScientificValidation:false,
   publicationAuthorised:false});continue}
  if(!seen.has(doi))seen.set(doi,await verifyDoi(doi,{fetchImpl,now,
   summaryText:item.sources[0].text}));
  const record=seen.get(doi);
  // No abstract is ever carried in the report. Multiple items sharing one
  // DOI share the first source's token-level diagnostic (not a gold label).
  findings.push({itemId:item.id,sourceId:item.sources[0].id,...record,
   abstractNumericalSignal:record.abstractNumericalSignal});
 }
 return {schema:"hpi_t072_primary_metadata_evidence_v1",
  classification:"PRIVATE_BIBLIOGRAPHIC_PROVENANCE_NOT_SCIENTIFIC_VALIDATION",
  sourceCount:items.length,verifiedRecordCount:findings.filter(
   x=>x.identityConfirmedByTwoCatalogues).length,
  failedOrUnsupportedCount:findings.filter(
   x=>!x.identityConfirmedByTwoCatalogues).length,
  registryRequests:seen.size*2,
  rightsGrantedForPublisherFullText:false,
  originalEmpiricalFindingsVerified:0,
  independentScientificValidation:false,publicationAuthorised:false,
  items:findings};
}
/** No AI inference may start unless each exact planned case has a current,
 * independently retrieved and DOI-consistent record from BOTH pinned APIs.
 * This never certifies the empirical claims or grants full-text reuse rights.
 */
export function assertPrimaryBibliographicGate(registry,plannedItems){
 if(registry?.schema!=="hpi_t072_primary_metadata_evidence_v1"||
  !Array.isArray(plannedItems)||!plannedItems.length||
  !Array.isArray(registry.items)||registry.items.length!==plannedItems.length)
  throw Error("Bibliographic identity preflight missing or incomplete");
 const matched=new Set();
 for(const item of plannedItems){
  const r=registry.items.find(x=>x.itemId===item.id);
  if(matched.has(item.id)||!r||
   r.doi!==canonicalDoi(item.sources?.[0]?.url)||
   r.status!=="bibliographic_identity_corroborated"||
   !r.identityConfirmedByTwoCatalogues||r.flags?.length!==0||
   r.registries?.crossref?.status!=="ok"||r.registries?.openalex?.status!=="ok"||
   !/^[a-f0-9]{64}$/.test(r.registries.crossref.metadataSha256??"")||
   !/^[a-f0-9]{64}$/.test(r.registries.openalex.metadataSha256??""))
   throw Error("Bibliographic identity gate refused source "+item.id);
  matched.add(item.id);
 }
 return true;
}
/**
 * Topical discovery uses a verified DOI's *registered title*; not an AI claim.
 * One Crossref search and at most two exact OpenAlex DOI checks.
 * Candidate papers are NEVER proof that they support/contradict a result.
 */
export async function discoverRelatedDois({seed,maxCandidates=2,
 fetchImpl=globalThis.fetch,now=()=>new Date().toISOString()}={}){
 if(!seed?.identityConfirmedByTwoCatalogues||!seed.crossref?.title||
  !Number.isInteger(maxCandidates)||maxCandidates<1||
  maxCandidates>DISCOVERY_MAX_CANDIDATES)
  throw Error("Cannot discover from uncorroborated source");
 const seedTitle=seed.crossref.title;
 const topic=seedTitle.slice(0,110).replace(/[^A-Za-z0-9 \-']/g," ").replace(/\s+/g," ").trim();
 if(topic.length<12)throw Error("No safe research topic from registered title");
 const url=CROSSREF+"/works?query.bibliographic="+encodeURIComponent(topic)+
  "&rows=8&select="+encodeURIComponent("DOI,title,container-title,type,publisher,published,issued,URL,license,relation");
 const searched=await readRegistryJson(url,{fetchImpl});
 if(!searched.ok)return {topic,status:"search_unavailable",reason:searched.reason,
  registryRequests:1,candidates:[],isNewScientificEvidence:false};
 const records=searched.data?.message?.items;
 if(!Array.isArray(records))return {topic,status:"invalid_search_response",
  registryRequests:1,candidates:[],isNewScientificEvidence:false};
 // Prefer journal registrations to preprint proxies; a Crossref entry can
 // have journal-article type even when its DOI is an SSRN registration.
 // Different DOIs / casing do NOT imply independent studies. De-duplicate
 // titles conservatively so one preprint + one journal article is not counted
 // as two independent sources of evidence.
 const eligible=[],seen=new Set([seed.doi]);
 for(const entry of records){
  const doi=canonicalDoi("https://doi.org/"+String(entry?.DOI??""));
  if(!doi||seen.has(doi)||entry.type!=="journal-article")continue;
  const title=str(entry.title?.[0],350);
  if(!title||titleSimilarity(seedTitle,title)<0.22)continue;
  seen.add(doi);eligible.push({doi,entry,title});
 }
 const rank=x=>x.doi.startsWith("10.2139/ssrn.")?0:1;
 eligible.sort((a,b)=>rank(b)-rank(a));
 const selected=[];let duplicateRegistrationCandidates=0;
 for(const entry of eligible){
  const existing=selected.find(x=>titleSimilarity(x.title,entry.title)>=0.82);
  if(existing){duplicateRegistrationCandidates++;continue}
  selected.push(entry);
  if(selected.length>=maxCandidates)break;
 }
 const candidates=[];
 for(const x of selected){
  const links=doiLinks(x.doi);
  const oa=await readRegistryJson(links.openalex,{fetchImpl});
  const identity=adjudicateBibliographicIdentity({
   doi:x.doi,crossrefRaw:x.entry,openalexRaw:oa.ok?oa.data:null,
   retrievedAt:now(),registries:{
    crossref:{status:"ok_from_search",metadataSha256:searched.retrievedMetadataSha256,
     endpoint:url},
    openalex:{status:oa.ok?"ok":oa.reason,
     metadataSha256:oa.retrievedMetadataSha256??null,endpoint:links.openalex}
   }
  });
  candidates.push({doi:x.doi,canonicalUrl:links.doi,title:identity.crossref?.title??null,
   year:identity.crossref?.publicationYear??null,
   status:identity.status,registrationCorroborated:identity.identityConfirmedByTwoCatalogues,
   possibleOriginalResultUnverified:true,
   rightsStatus:identity.rights.rightsStatus,
   requiresIndependentQuantitativeSourceReading:true,
   directMetadata:identity});
 }
 return {schema:"hpi_t072_related_primary_discovery_v1",topic,
  seedDoi:seed.doi,status:"completed",
  registryRequests:1+selected.length,
  candidateRegistrationsDeduplicated:duplicateRegistrationCandidates,
  studyDeduplicationHeuristic:true,
  independentStudiesConfirmed:false,
  candidates,
  containsUnlicensedFullText:false,
  isNewScientificEvidence:false,
  validatesSourceCausality:false,publicationAuthorised:false};
}
