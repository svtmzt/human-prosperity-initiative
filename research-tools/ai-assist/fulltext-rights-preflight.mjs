/**
 * HPI-AI.6-T07.3: publisher-VOR text access preflight. Zero GETs of PDFs or
 * publisher text, no credentials, no redirects, no scraping or cloud AI.
 * A CC BY declaration permits some reuse with attribution, but access rights,
 * source version and technical availability are separate decisions.
 */
import {canonicalDoi} from "./primary-provenance.mjs";
const SPRINGER="https://link.springer.com";
const allowedType=/^(application\/pdf|text\/html)(?:;|$)/i;

/** Fail closed unless two registries confirm exact publisher VOR CC BY. */
export function inspectOriginalVersionEligibility(record){
 const result={doi:record?.doi??null,
  identityConfirmed:record?.identityConfirmedByTwoCatalogues===true,
  declaredCcByVersionOfRecord:false,
  authenticatedOriginalPublisherAccess:false,
  safeToDownloadFullText:false,
  safeToSendFullTextToCloud:false,
  safeToRedistributeWithoutAttribution:false,
  openAlexMetadataIsNotAnAccessGrant:true,
  rightsAssessment:"not_eligible",
  publisherProbeUrl:null,
  reason:null};
 if(!result.identityConfirmed||!canonicalDoi(record?.canonicalUrl)||
  canonicalDoi(record.canonicalUrl)!==record.doi){
  result.reason="bibliographic_identity_or_doi_missing";return result;
 }
 const rights=record.rights;
 const ccByVor=rights?.crossrefDeclarations?.some(x=>
  x.label==="crossref_cc_by_declaration"&&x.contentVersion==="vor")===true;
 const oaPrimary=rights?.publisherVersionLicenseSlug==="cc-by";
 result.declaredCcByVersionOfRecord=ccByVor&&oaPrimary;
 if(!result.declaredCcByVersionOfRecord){
  result.reason="publisher_version_cc_by_not_corroborated";return result;
 }
 if(!record.doi.startsWith("10.1007/")){
  result.reason="no_pinned_publisher_adapter";return result;
 }
 const url=SPRINGER+"/article/"+record.doi;
 if(url.length>250){
  result.reason="unsupported_original_url";return result;
 }
 result.publisherProbeUrl=url;
 result.rightsAssessment="publisher_version_cc_by_metadata_corroborated";
 result.reason="access_not_yet_tested";
 return result;
}
/** HEAD ONLY; this never downloads original publisher content. */
export async function probeOriginalAccess(record,{
 fetchImpl=globalThis.fetch,timeoutMs=9000
}={}){
 const eligible=inspectOriginalVersionEligibility(record);
 if(!eligible.publisherProbeUrl)return {...eligible,networkRequests:0};
 const u=new URL(eligible.publisherProbeUrl);
 if(u.origin!==SPRINGER||u.username||u.password||u.search||u.hash||
  canonicalDoi("https://doi.org/"+u.pathname.slice("/article/".length))!==record.doi)
  throw Error("Unrecognised original publisher URL");
 let response;
 try{
  response=await fetchImpl(eligible.publisherProbeUrl,{
   method:"HEAD",redirect:"manual",
   headers:{accept:"text/html,application/pdf"},
   signal:AbortSignal.timeout(timeoutMs)
  });
 }catch{return {...eligible,reason:"publisher_access_probe_unavailable",networkRequests:1}}
 const type=response.headers?.get?.("content-type")??"";
 const redirect=[301,302,303,307,308].includes(response.status);
 const length=Number(response.headers?.get?.("content-length")??NaN);
 const enough=Number.isFinite(length)?length>0:true;
 const accessible=response.status===200&&allowedType.test(type)&&enough;
 return {...eligible,
  authenticatedOriginalPublisherAccess:accessible,
  safeToDownloadFullText:false, // separate carefully audited GET adapter needed
  safeToSendFullTextToCloud:false,networkRequests:1,
  httpStatus:response.status,
  responseContentType:allowedType.test(type)?type.split(";")[0]:null,
  redirectRefused:redirect,
  reason:redirect?"publisher_redirect_or_authentication_required":
   !accessible?"original_not_accessible_without_authentication":
   "metadata_and_head_accessible_but_get_not_authorised_in_this_phase"};
}
