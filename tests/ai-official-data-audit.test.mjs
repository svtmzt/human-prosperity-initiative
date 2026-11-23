import test from "node:test";
import assert from "node:assert/strict";
import {
 officialWdiUrls,readOfficialWdiJson,verifyWdiMetadata,
 computeBrazilPovertyAggregate,reproduceOfficialAggregate
} from "../research-tools/ai-assist/official-data-audit.mjs";
const names={
 poverty:"Poverty headcount ratio at $3.00 a day (2021 PPP) (% of population)",
 population:"Population, total"};
const sources={poverty:"SI.POV.DDAY",population:"SP.POP.TOTL"};
const last="2026-11-11";
const meta=k=>[{page:1,pages:1,per_page:50,total:1},[{
 id:sources[k],name:names[k],source:{id:"2",value:"World Development Indicators"},
 sourceNote:k==="poverty"?"2021 PPP; methodology revisions":"de facto midyear population"}]];
const doc=(kind,values=[
 ["2022",kind==="poverty"?4.9:210306415],
 ["2023",kind==="poverty"?3.8:211140729],
 ["2024",kind==="poverty"?3.0:211998573]
])=>[{page:1,pages:1,total:values.length,sourceid:"2",lastupdated:last},values.map(([y,v])=>({
 date:y,value:v,countryiso3code:"BRA",country:{id:"BR",value:"Brazil"},
 indicator:{id:sources[kind],value:names[kind]},unit:"",obs_status:""
 }))];
const metaBoth=()=>({poverty:meta("poverty"),population:meta("population")});
const fixture=()=>({metadata:metaBoth(),povertyDoc:doc("poverty"),
 populationDoc:doc("population")});
const response=x=>new Response(JSON.stringify(x),{status:200,
 headers:{"content-type":"application/json"}});
test("exact public data provenance URLs are pinned and require no credentials",()=>{
 const urls=officialWdiUrls();
 assert.equal(Object.keys(urls).length,4);
 assert.ok(Object.values(urls).every(u=>u.startsWith("https://api.worldbank.org/v2/")));
 assert.ok(!Object.values(urls).some(u=>u.includes("key=")));
 assert.ok(urls.povertySeries.includes("/country/BRA/"));
});
test("independently re-compute Brazil official aggregate arithmetic using same-year observations",()=>{
 const out=computeBrazilPovertyAggregate(fixture());
 assert.equal(out.schema,"hpi_ai6_t073b_official_aggregate_reproduction_v1");
 assert.deepEqual(out.rows.map(x=>x.year),["2022","2023","2024"]);
 assert.deepEqual(out.rows.map(x=>x.ratePercent),[4.9,3.8,3]);
 assert.deepEqual(out.rows.map(x=>x.estimatedPopulationBelowPovertyLine),
  [10305014,8023348,6359957]);
 assert.equal(out.comparison.rateDifferencePercentagePoints,-1.9);
 assert.equal(out.comparison.estimatedHeadcountDifference,6359957-10305014);
 assert.equal(out.comparison.isCausalAttribution,false);
 assert.equal(out.rows.every(x=>x.isWorldBankOfficialPoorCount===false),true);
 assert.equal(out.license.license,"CC BY 4.0");
 assert.equal(out.dataReproducibility.microdataExperimentReplications,0);
 assert.equal(out.scientificPublicationAuthorised,false);
});
test("both indicator names, source IDs and unit definitions must match",()=>{
 let f=fixture();
 f.metadata.poverty[1][0].name="Old $2.15 poverty rate (2017 PPP)";
 assert.throws(()=>computeBrazilPovertyAggregate(f),/metadata/);
 f=fixture();f.metadata.population[1][0].source.id="1";
 assert.throws(()=>computeBrazilPovertyAggregate(f),/metadata/);
 f=fixture();f.metadata.poverty[0].pages=2;
 assert.throws(()=>computeBrazilPovertyAggregate(f),/metadata/);
});
test("foreign country, source id, duplicate or absent years never get interpolated",()=>{
 let f=fixture();
 f.povertyDoc[1][0].countryiso3code="GBR";
 assert.throws(()=>computeBrazilPovertyAggregate(f),/country mismatch/);
 f=fixture();f.povertyDoc[0].sourceid="7";
 assert.throws(()=>computeBrazilPovertyAggregate(f),/series shape/);
 f=fixture();f.populationDoc[1][1].date="2022";
 assert.throws(()=>computeBrazilPovertyAggregate(f),/Duplicate/);
 f=fixture();f.povertyDoc[1][1].value=null;
 assert.throws(()=>computeBrazilPovertyAggregate(f),/No complete/);
});
test("missing or invalid percentages and population counts are rejected",()=>{
 let f=fixture();
 f.povertyDoc[1][0].value=102;
 assert.throws(()=>computeBrazilPovertyAggregate(f),/No complete/);
 f=fixture();f.populationDoc[1][0].value=-12;
 assert.throws(()=>computeBrazilPovertyAggregate(f),/No complete/);
 f=fixture();f.populationDoc[1][0].value=234.4;
 assert.throws(()=>computeBrazilPovertyAggregate(f),/No complete/);
 f=fixture();f.populationDoc[1][0].value="210306415";
 assert.throws(()=>computeBrazilPovertyAggregate(f),/series schema/);
});
test("reader rejects arbitrary outbound URLs and unapproved query fields",async()=>{
 for(const url of [
  "https://api.worldbank.org.evil.example/v2/country/BRA/indicator/SI.POV.DDAY?format=json&per_page=200",
  "http://api.worldbank.org/v2/indicator/SI.POV.DDAY?format=json",
  "https://api.worldbank.org/v2/country/GBR/indicator/SI.POV.DDAY?format=json&per_page=200",
  "https://api.worldbank.org/v2/country/BRA/indicator/SP.POP.TOTL?format=json&redirect=http://example.org",
  "https://api.worldbank.org/v2/indicator/SI.POV.DDAY?format=xml"
 ])await assert.rejects(readOfficialWdiJson(url),/refused/);
});
test("bounded response handling rejects unexpected HTML, overflow and redirects",async()=>{
 const url=officialWdiUrls().povertyMetadata;
 const badType=await readOfficialWdiJson(url,{fetchImpl:async()=>new Response("<html/>",
  {headers:{"content-type":"text/html"}})});
 assert.equal(badType.ok,false);
 const large=await readOfficialWdiJson(url,{fetchImpl:async()=>new Response(
  "x".repeat(550000),{headers:{"content-type":"application/json"}})});
 assert.equal(large.reason,"too_large");
 const redirect=await readOfficialWdiJson(url,{fetchImpl:async()=>new Response("",{
  status:302,headers:{location:"https://evil.example"}})});
 assert.equal(redirect.ok,false);
});
test("full orchestrator makes exactly four official GETs and writes only digests and derived aggregates",async()=>{
 const urls=officialWdiUrls(),calls=[];
 const lookup=new Map([
  [urls.povertyMetadata,meta("poverty")],
  [urls.populationMetadata,meta("population")],
  [urls.povertySeries,doc("poverty")],
  [urls.populationSeries,doc("population")]
 ]);
 const out=await reproduceOfficialAggregate({
  fetchImpl:async(url,options)=>{
   calls.push({url,options});
   if(!lookup.has(url))throw Error("Unexpected fetch");
   return response(lookup.get(url));
  }});
 assert.equal(calls.length,4);
 assert.equal(out.provenance.readOnlyPublicApiCalls,4);
 assert.ok(calls.every(c=>c.options.method==="GET"&&c.options.redirect==="error"));
 assert.ok(calls.every(c=>!c.options.headers.authorization));
 assert.equal(out.rows.length,3);
 assert.ok(Object.values(out.provenance.originalResponseDigestsSha256).every(
  x=>/^[a-f0-9]{64}$/.test(x)));
 assert.equal(JSON.stringify(out).includes("2026-11-11"),true);
 assert.equal(out.provenance.noOriginalResponseBodiesPersisted,true);
});

test("two official data series with different API update vintages cannot be silently mixed",()=>{
 const x=fixture();x.populationDoc[0].lastupdated="2026-11-10";
 assert.throws(()=>computeBrazilPovertyAggregate(x),/different API update dates/);
});
