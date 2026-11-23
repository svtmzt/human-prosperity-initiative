import test from "node:test";
import assert from "node:assert/strict";
import {
 canonicalDoi,doiLinks,titleSimilarity,readRegistryJson,
 normalizeCrossrefRecord,normalizeOpenAlexRecord,adjudicateBibliographicIdentity,
 depositedAbstractPercentageSignal,
 verifyDoi,verifyPrimaryRecords,discoverRelatedDois,assertPrimaryBibliographicGate
} from "../research-tools/ai-assist/primary-provenance.mjs";
import {selectPrimaryCases} from "../scripts/ai-primary-provenance.mjs";

const doi="10.1093/qje/qjz013",another="10.1257/pol.20200603";
const title="Take-Up and Targeting: Experimental Evidence from SNAP";
const crossref={DOI:doi,title:[title],type:"journal-article",
 publisher:"Oxford University Press (OUP)",
 "container-title":["The Quarterly Journal of Economics"],
 published:{"date-parts":[[2019,5,2]]},
 license:[{URL:"https://academic.oup.com/journals/pages/open_access/funder_policies/chorus/standard_publication_model",
  "content-version":"vor"}],
 abstract:"<jats:p>Example abstract with copyright restrictions</jats:p>",
 link:[{"content-type":"application/pdf","intended-application":"syndication"}]};
const openalex={doi:"https://doi.org/"+doi,title,
 publication_year:2019,is_retracted:false,id:"https://openalex.org/W123",
 primary_location:{license:null,is_oa:false,landing_page_url:"https://doi.org/"+doi},
 best_oa_location:{license:"cc-by-nc-sa",is_oa:true,
  source:{type:"repository",display_name:"MIT DSpace"},
  landing_page_url:"https://hdl.handle.net/1721.1/123496"},
 open_access:{oa_status:"green"}};
const envelope=x=>new Response(JSON.stringify(x),{status:200,
 headers:{"content-type":"application/json"}});
function mockRegistry({
 crossrefRecord=crossref,openalexRecord=openalex,missing=null,search=null
}={}){
 const calls=[];
 const fetchImpl=async(url,opt)=>{
  calls.push({url,opt});
  if(missing&&url.includes(missing))return new Response("gone",{status:404});
  if(url.includes("query.bibliographic="))
   return envelope({message:{items:search??[]}});
  if(url.startsWith("https://api.crossref.org/works/"))
   return envelope({status:"ok",message:crossrefRecord});
  if(url.startsWith("https://api.openalex.org/works/"))
   return envelope(openalexRecord);
  throw Error("Unexpected remote host: "+url);
 };
 return {fetchImpl,calls};
}
const source={id:"E08",url:"https://doi.org/"+doi,
 text:"SNAP enrolment increased for eligible older adults following support in a documented field experiment.",
 dataClass:"public_research_metadata"};
const item={id:"claim:E08",task:"claim-extraction",sources:[source],
 reference:{claims:[{secretGold:"NEVER_SEND_MODEL_REFERENCE"}]}};
const dataset={items:[item]};
test("canonical DOI parsing refuses URLs, credentials, protocols and malicious identifiers",()=>{
 assert.equal(canonicalDoi("https://doi.org/"+doi),doi);
 assert.equal(canonicalDoi("https://doi.org/10.1093%2Fqje%2Fqjz013"),doi);
 for(const bad of ["http://doi.org/"+doi,"https://doi.org.evil.test/"+doi,
  "https://doi.org@evil.test/"+doi,"https://doi.org/"+doi+"?report=private",
  "https://doi.org/"+doi+"#data","https://doi.org/10.1093%2Fqje%2F..",
  "file:///etc/passwd","https://pmc.ncbi.nlm.nih.gov/articles/PMC9187783/"])
  assert.equal(canonicalDoi(bad),null,"Should reject "+bad);
 const urls=doiLinks(doi);
 assert.equal(urls.crossref,"https://api.crossref.org/works/10.1093%2Fqje%2Fqjz013");
 assert.ok(urls.openalex.startsWith("https://api.openalex.org/works/"));
 assert.throws(()=>doiLinks("10.1000/ab%20cd"),/Invalid/);
});
test("public source selector strips answers and rejects personal source data",()=>{
 const selected=selectPrimaryCases(dataset,["claim:E08"]);
 assert.equal(selected.length,1);
 assert.equal(selected[0].task,"claim-extraction");
 assert.equal(JSON.stringify(selected).includes("NEVER_SEND_MODEL_REFERENCE"),false);
 assert.throws(()=>selectPrimaryCases(dataset,["claim:E08","claim:E08"]),/unique/);
 const unsafe={items:[{...item,sources:[{...source,
  text:"This document belongs to Jane Smith, email jane@example.org"}]}]};
 assert.throws(()=>selectPrimaryCases(unsafe,["claim:E08"]),/Unsafe/);
 const restricted={items:[{...item,sources:[{...source,dataClass:"internal_draft"}]}]};
 assert.throws(()=>selectPrimaryCases(restricted,["claim:E08"]),/Unsafe/);
});
test("registry reader pins two official HTTPS API hosts and refuses redirects or non-JSON",async()=>{
 await assert.rejects(readRegistryJson("https://evil.example/api?url=https://api.crossref.org/works/x"),/refused/);
 await assert.rejects(readRegistryJson("https://api.crossref.org@evil.example/works/x"),/refused/);
 await assert.rejects(readRegistryJson("https://api.crossref.org/profiles/private"),/refused/);
 await assert.rejects(readRegistryJson("http://api.openalex.org/works/x"),/refused/);
 const gate=mockRegistry();
 const result=await readRegistryJson(doiLinks(doi).crossref,{fetchImpl:gate.fetchImpl});
 assert.equal(result.ok,true);
 assert.equal(gate.calls[0].opt.redirect,"error");
 assert.equal(gate.calls[0].opt.method,"GET");
 assert.equal(gate.calls[0].opt.headers.authorization,undefined);
 assert.match(result.retrievedMetadataSha256,/^[a-f0-9]{64}$/);
 const nonjson=await readRegistryJson(doiLinks(doi).crossref,{
  fetchImpl:async()=>new Response("<html/>",{headers:{"content-type":"text/html"}})});
 assert.equal(nonjson.ok,false);
 assert.equal(nonjson.reason,"unexpected_content_type");
});
test("oversized registry response is rejected even if content-length omitted",async()=>{
 const r=await readRegistryJson(doiLinks(doi).crossref,{
  fetchImpl:async()=>new Response(JSON.stringify({huge:"x".repeat(500000)}),{
   headers:{"content-type":"application/json","transfer-encoding":"chunked"}})});
 assert.equal(r.ok,false);
 assert.equal(r.reason,"metadata_too_large");
});
test("two matching bibliographic registry identities corroborate DOI, not findings or rights",()=>{
 const output=adjudicateBibliographicIdentity({
  doi,crossrefRaw:crossref,openalexRaw:openalex,
  retrievedAt:"2026-11-23T13:00:00.000Z"
 });
 assert.equal(output.status,"bibliographic_identity_corroborated");
 assert.equal(output.identityConfirmedByTwoCatalogues,true);
 assert.equal(output.crossref.publicationYear,2019);
 assert.equal(output.openalex.oaStatus,"green");
 assert.equal(output.originalEmpiricalFindingVerified,false);
 assert.equal(output.publicationAuthorised,false);
 assert.equal(output.rights.bestOpenCopyLicenseSlug,"cc-by-nc-sa");
 assert.equal(output.rights.bestOpenCopyHasRestrictedTerms,true);
 assert.equal(output.rights.grantToDownloadPublisherFullText,false);
 assert.equal(output.rights.grantToFeedThirdPartyPublisherTextToCloud,false);
 assert.equal(output.rights.grantToRepublishPublisherText,false);
 assert.equal(JSON.stringify(output).includes("Example abstract"),false);
});
test("conflicting DOI, titles, years and retractions fail bibliographic identity closed",()=>{
 assert.equal(normalizeCrossrefRecord({...crossref,DOI:"10.9999/wrong"},doi),null);
 assert.equal(normalizeOpenAlexRecord({...openalex,doi:"https://doi.org/10.9999/wrong"},doi),null);
 assert.equal(titleSimilarity(title,"A paper about a distant planet orbiting Jupiter")<0.3,true);
 const conflict=adjudicateBibliographicIdentity({
  doi,crossrefRaw:crossref,
  openalexRaw:{...openalex,title:"A completely unrelated paper about environmental engineering",
   publication_year:2014,is_retracted:true}
 });
 assert.equal(conflict.identityConfirmedByTwoCatalogues,false);
 assert.ok(conflict.flags.includes("bibliographic_title_conflict"));
 assert.ok(conflict.flags.includes("publication_year_conflict"));
 assert.ok(conflict.flags.includes("possible_correction_or_retraction"));
});
test("read-only primary verifier uses exactly two pinned metadata queries per unique DOI",async()=>{
 const {fetchImpl,calls}=mockRegistry();
 const output=await verifyPrimaryRecords({items:[item,
  {...item,id:"claim:E08-second",sources:[{...source,id:"E08b"}]}],
  fetchImpl,now:()=>"2026-11-23T13:00:00Z"});
 assert.equal(output.sourceCount,2);
 assert.equal(output.verifiedRecordCount,2);
 assert.equal(output.registryRequests,2); // same DOI deduplicated
 assert.equal(calls.length,2);
 assert.equal(output.originalEmpiricalFindingsVerified,0);
 assert.equal(output.publicationAuthorised,false);
 assert.ok(calls.every(x=>x.url.startsWith("https://api.")));
 assert.ok(calls.every(x=>!x.opt.headers.authorization));
});
test("non-DOI source, registry failures and data contamination remain blocked",async()=>{
 const {fetchImpl,calls}=mockRegistry({missing:"openalex.org"});
 const output=await verifyPrimaryRecords({items:[item],fetchImpl});
 assert.equal(output.verifiedRecordCount,0);
 assert.equal(output.items[0].identityConfirmedByTwoCatalogues,false);
 assert.equal(output.items[0].flags.includes("openalex_identity_or_record_missing"),true);
 const nonDoi=await verifyPrimaryRecords({items:[{
  ...item,sources:[{...source,url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC9187783/"}]
 }],fetchImpl});
 assert.equal(nonDoi.items[0].status,"non_doi_source_requires_dedicated_adapter");
 assert.equal(nonDoi.registryRequests,0);
 assert.equal(calls.length,2);
 await assert.rejects(verifyPrimaryRecords({items:[{
  ...item,sources:[{...source,text:"contact alice@example.org for private records"}]
 }],fetchImpl}),/Unsafe/);
});
test("a verified seed can discover new related DOIs without claiming study findings",async()=>{
 const seed=adjudicateBibliographicIdentity({
  doi,crossrefRaw:crossref,openalexRaw:openalex
 });
 const alt="10.17310/ntj.2019.2.04";
 const candidate={...crossref,DOI:alt,title:["Take-Up and Targeting Experimental Evidence for SNAP Transfer Programmes"],
  published:{"date-parts":[[2021,2,5]]}};
 const registry=mockRegistry({search:[crossref,candidate,
  {...crossref,DOI:"10.9999/unrelated",title:["A paper about distant planets"]}],
  openalexRecord:{...openalex,doi:"https://doi.org/"+alt,
   title:candidate.title[0],publication_year:2021}});
 const result=await discoverRelatedDois({seed,maxCandidates:1,
  fetchImpl:registry.fetchImpl});
 assert.equal(result.status,"completed");
 assert.equal(result.registryRequests,2);
 assert.equal(result.candidates.length,1);
 assert.equal(result.candidates[0].doi,alt);
 assert.equal(result.candidates[0].registrationCorroborated,true);
 assert.equal(result.candidates[0].possibleOriginalResultUnverified,true);
 assert.equal(result.isNewScientificEvidence,false);
 assert.equal(result.publicationAuthorised,false);
 assert.equal(registry.calls.length,2);
});
test("one provider unavailable is not silently treated as independent validation",async()=>{
 const registry=mockRegistry({missing:"openalex.org"});
 const r=await verifyDoi(doi,{fetchImpl:registry.fetchImpl});
 assert.equal(r.identityConfirmedByTwoCatalogues,false);
 assert.equal(r.originalEmpiricalFindingVerified,false);
 assert.match(r.registries.openalex.status,/http_404/);
});

test("Crossref deposited-abstract percentage comparison is in-memory and never proves effects",()=>{
 const signal=depositedAbstractPercentageSignal(
  "Control 6%; information 11%; help 18%",
  "<jats:p>According to this document: 18% then 6% and 11%.</jats:p>");
 assert.equal(signal.summaryPercentageTokens,3);
 assert.equal(signal.foundInDepositedAbstract,3);
 assert.equal(signal.abstractTextStored,false);
 assert.equal(signal.scientificClaimVerified,false);
 assert.equal(JSON.stringify(signal).includes("According to this document"),false);
 const absent=depositedAbstractPercentageSignal("No detectable change in applications",null);
 assert.equal(absent.summaryPercentageTokens,0);
 assert.equal(absent.foundInDepositedAbstract,0);
 assert.equal(absent.depositedAbstractPresent,false);
});

test("preprint and journal registrations of one title are not counted as two independent sources",async()=>{
 const seed=adjudicateBibliographicIdentity({doi,crossrefRaw:crossref,openalexRaw:openalex});
 const title="Does Informing Employees About Tax Benefits Increase Take-Up Evidence From EITC Notification Laws";
 const ssrn={...crossref,DOI:"10.2139/ssrn.3318077",title:[title],publisher:"Elsevier BV"};
 const journal={...crossref,DOI:"10.17310/ntj.2019.2.04",title:[title.toUpperCase()],publisher:"University of Chicago Press"};
 const {fetchImpl,calls}=mockRegistry({search:[ssrn,journal],
  openalexRecord:{...openalex,doi:"https://doi.org/10.17310/ntj.2019.2.04",
   title:journal.title[0]}});
 const discovered=await discoverRelatedDois({seed,fetchImpl,maxCandidates:2});
 assert.equal(discovered.candidates.length,1);
 assert.equal(discovered.candidates[0].doi,"10.17310/ntj.2019.2.04");
 assert.equal(discovered.candidateRegistrationsDeduplicated,1);
 assert.equal(discovered.independentStudiesConfirmed,false);
 assert.equal(discovered.registryRequests,2);
 assert.equal(calls.length,2);
});

test("integrated inference gate requires exact case IDs and both real registry digests",async()=>{
 const {fetchImpl}=mockRegistry();
 const cases=[item];
 const verified=await verifyPrimaryRecords({items:cases,fetchImpl});
 assert.equal(assertPrimaryBibliographicGate(verified,cases),true);
 assert.throws(()=>assertPrimaryBibliographicGate(verified,[{
  ...item,id:"claim:DIFFERENT"}]),/refused/);
 const tampered=structuredClone(verified);
 tampered.items[0].registries.openalex.metadataSha256=null;
 assert.throws(()=>assertPrimaryBibliographicGate(tampered,cases),/refused/);
 const fakeCounts={...verified,verifiedRecordCount:1,items:[]};
 assert.throws(()=>assertPrimaryBibliographicGate(fakeCounts,cases),/missing or incomplete/);
});
