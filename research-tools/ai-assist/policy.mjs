/**
 * HPI-AI data-routing policy. Decides, before any request is built, whether a
 * piece of text may be sent to a given inference boundary. Fail-closed: an
 * unknown classification, an unknown provider kind or detected personal data
 * means "do not send".
 *
 * Boundaries:
 *  - "local": a loopback OpenAI-compatible runtime on the researcher's own
 *    machine (Ollama, LM Studio, llama.cpp server, LiteLLM). Text does not
 *    leave the machine.
 *  - "free_cloud": verified zero-price OpenRouter models routed only to
 *    endpoints that OpenRouter reports as not collecting prompt data
 *    (provider.data_collection="deny"), or ZDR endpoints when requested.
 *  - "approved_remote": an explicitly allowlisted OpenAI-compatible host
 *    (organisational gateway). Treated like cloud for data purposes.
 *
 * This policy never claims Zero Data Retention unless the endpoint is on
 * OpenRouter's published ZDR list and the request enforces zdr=true.
 */

export const DATA_CLASSES=Object.freeze({
 public_research_metadata:{label:"Publicly available research metadata",
  description:"HPI-authored summaries, citations and transcribed headline figures already published on the HPI website under CC BY 4.0 (third-party figures attributed).",
  local:true,free_cloud:true,approved_remote:true},
 redistributable_excerpt:{label:"Redistributable source excerpt",
  description:"Short excerpts whose licence permits redistribution (for example OGL-3.0 or CC BY), recorded with the licence evidence.",
  local:true,free_cloud:true,approved_remote:true},
 copyright_restricted:{label:"Copyright-restricted material",
  description:"Full text or long excerpts of publisher-copyrighted work. Local analysis only; never transmitted to external providers.",
  local:true,free_cloud:false,approved_remote:false},
 internal_draft:{label:"Internal research draft",
  description:"Unpublished HPI drafts and review notes. Local only until published.",
  local:true,free_cloud:false,approved_remote:false},
 sensitive_identifying:{label:"Sensitive or identifying information",
  description:"Anything that identifies or could identify a person, or health, financial or application details about a person. Not processed by AI in this release.",
  local:false,free_cloud:false,approved_remote:false},
 beneficiary_record:{label:"Real beneficiary or case record",
  description:"Records about real beneficiaries, claimants, applicants or cases. Never processed by AI; fieldwork remains NO-GO.",
  local:false,free_cloud:false,approved_remote:false}
});
export const BOUNDARIES=Object.freeze(["local","free_cloud","approved_remote"]);

const REASON={
 copyright_restricted:"Copyright-restricted text may only be analysed by a local model; it is never sent to an external provider.",
 internal_draft:"Unpublished internal drafts stay on the local boundary until they are published.",
 sensitive_identifying:"Sensitive or identifying information is not processed by AI in this release (research ethics gate #67 and a data-protection assessment are required first).",
 beneficiary_record:"Real beneficiary or case records are never processed by AI."
};

/** Decide whether text of a data class may cross an inference boundary. */
export function checkRouting({dataClass,boundary}){
 const cls=DATA_CLASSES[dataClass];
 if(!cls)return {allowed:false,reason:"Unknown data classification '"+dataClass+"'; refusing by default."};
 if(!BOUNDARIES.includes(boundary))return {allowed:false,reason:"Unknown inference boundary '"+boundary+"'; refusing by default."};
 if(!cls[boundary])return {allowed:false,reason:REASON[dataClass]||"Not permitted for this boundary."};
 return {allowed:true,reason:null};
}

// Patterns that indicate personal data. A match reclassifies the text as
// sensitive_identifying, which no boundary accepts. Deliberately broad: a
// false positive costs one skipped request; a false negative could leak data.
export const PERSONAL_DATA_PATTERNS=Object.freeze([
 ["email_address",/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
 ["uk_national_insurance_number",/\b[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/],
 ["nhs_number",/\b\d{3}\s\d{3}\s\d{4}\b/],
 ["brazil_cpf",/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/],
 ["italy_codice_fiscale",/\b[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]\b/],
 ["phone_number",/(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]\d{3,4}[\s-]\d{3,4}\b/],
 ["uk_postcode_with_house_number",/\b\d{1,4}[A-Za-z]?\s+[A-Za-z][A-Za-z ]{2,40},?\s+[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/],
 ["date_of_birth",/\b(?:d\.?o\.?b\.?|date\s+of\s+birth|born\s+on)\b/i],
 ["case_or_claim_reference",/\b(?:claim|case|application|client|beneficiary)\s*(?:no\.?|number|ref(?:erence)?|id)\s*[:#]?\s*[A-Z0-9-]{4,}/i]
]);
export function screenPersonalData(text){
 const s=String(text??"");
 return PERSONAL_DATA_PATTERNS.filter(([,re])=>re.test(s)).map(([kind])=>kind);
}

/**
 * Classify an HPI knowledge-base source for routing. Only records that the
 * build already publishes are public; anything else defaults to
 * internal_draft (local only). Personal-data indicators override everything.
 */
export function classifySource(source){
 const findings=screenPersonalData(source?.text);
 if(findings.length)return {dataClass:"sensitive_identifying",basis:"personal_data_indicators:"+findings.join(","),personalData:findings};
 const declared=source?.dataClass;
 if(declared&&DATA_CLASSES[declared])return {dataClass:declared,basis:source.dataClassBasis||"declared",personalData:[]};
 return {dataClass:"internal_draft",basis:"no recorded classification; defaulting to local-only",personalData:[]};
}

/** Public, secret-free description of the routing policy for the website. */
export function describeRoutingPolicy(){
 return Object.entries(DATA_CLASSES).map(([id,c])=>({id,label:c.label,description:c.description,
  local:c.local,freeCloud:c.free_cloud,approvedRemote:c.approved_remote}));
}
