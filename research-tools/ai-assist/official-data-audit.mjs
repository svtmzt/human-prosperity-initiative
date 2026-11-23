/**
 * HPI-AI.6-T07.3b — bounded independent public aggregate-data computation.
 *
 * World Bank WDI original published indicator series, not randomized trial
 * microdata. Reproducible descriptive arithmetic only; never infer that
 * changing national poverty counts are caused by an HPI intervention.
 * No PII, cookies, arbitrary URLs, AI inference, or paid endpoints.
 */
import {createHash} from "node:crypto";
const ORIGIN="https://api.worldbank.org";
const BASE=ORIGIN+"/v2";
const INDICATORS=Object.freeze({
 poverty:"SI.POV.DDAY",population:"SP.POP.TOTL"
});
const NAME_POVERTY="Poverty headcount ratio at $3.00 a day (2021 PPP) (% of population)";
const NAME_POP="Population, total";
const MAX=500_000;
const digest=s=>createHash("sha256").update(s).digest("hex");
export const WDI_LICENSE={
 label:"World Development Indicators catalog: CC BY 4.0 (source attribution required)",
 catalog:"https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators",
 permissionFromCatalogNotField:"Catalog-level CC BY; per-indicator attribution and methodology must be preserved",
 license:"CC BY 4.0"
};
const whitelist=url=>{
 const u=new URL(url);
 if(u.origin!==ORIGIN||u.username||u.password||u.hash||
   !/^\/v2\/(?:indicator\/(?:SI\.POV\.DDAY|SP\.POP\.TOTL)|country\/BRA\/indicator\/(?:SI\.POV\.DDAY|SP\.POP\.TOTL))$/.test(u.pathname)||
   u.searchParams.get("format")!=="json"||
   [...u.searchParams.keys()].some(k=>!["format","per_page"].includes(k))||
   (u.searchParams.has("per_page")&&u.searchParams.get("per_page")!=="200"))
  throw Error("World Bank pinned official endpoint refused");
};
export function officialWdiUrls(){
 const m=id=>BASE+"/indicator/"+id+"?format=json";
 const s=id=>BASE+"/country/BRA/indicator/"+id+"?format=json&per_page=200";
 return {povertyMetadata:m(INDICATORS.poverty),
  populationMetadata:m(INDICATORS.population),
  povertySeries:s(INDICATORS.poverty),
  populationSeries:s(INDICATORS.population)};
}
export async function readOfficialWdiJson(url,{fetchImpl=globalThis.fetch}={}){
 whitelist(url);
 let response;
 try{response=await fetchImpl(url,{method:"GET",redirect:"error",
  headers:{accept:"application/json","user-agent":"HPI-AI6-reproducibility/0.1"},
  signal:AbortSignal.timeout(12000)})}
 catch{return {ok:false,reason:"network_error_or_redirect_refused"}}
 if(!response?.ok)return {ok:false,reason:"http_"+String(response?.status)};
 if(!/application\/json/i.test(response.headers?.get?.("content-type")??""))
  return {ok:false,reason:"non_json_response"};
 const declared=Number(response.headers.get("content-length")??0);
 if(Number.isFinite(declared)&&declared>MAX)return {ok:false,reason:"too_large"};
 if(!response.body?.getReader)return {ok:false,reason:"no_stream"};
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>MAX){await reader.cancel();return {ok:false,reason:"too_large"}}
   chunks.push(value);
  }
  const all=new Uint8Array(size);let off=0;
  for(const c of chunks){all.set(c,off);off+=c.length}
  const raw=new TextDecoder("utf-8",{fatal:true}).decode(all);
  return {ok:true,json:JSON.parse(raw),rawSha256:digest(raw),bytes:size};
 }catch{return {ok:false,reason:"malformed_json"}}
 finally{reader.releaseLock()}
}
export function verifyWdiMetadata({poverty,population}){
 const checks=[[poverty,INDICATORS.poverty,NAME_POVERTY],
  [population,INDICATORS.population,NAME_POP]];
 return checks.map(([doc,id,name])=>{
  const item=doc?.[1]?.[0],page=doc?.[0];
  if(!Array.isArray(doc)||!page||!item||page.pages!==1||
   item.id!==id||item.name!==name||item.source?.id!=="2"||
   item.source?.value!=="World Development Indicators")
   throw Error("Unexpected WDI indicator metadata for "+id);
  return {indicator:id,name,sourceId:"2",sourceName:item.source.value,
   sourceNote:item.sourceNote??null,
   reportedSeriesPovertyThreshold:id===INDICATORS.poverty?"$3/day (2021 PPP)":null};
 });
}
function uniqueYears(doc,id){
 if(!Array.isArray(doc)||doc.length!==2||!Array.isArray(doc[1])||
  doc[0]?.pages!==1||doc[0]?.sourceid!=="2"||
  !/^\d{4}-\d{2}-\d{2}$/.test(doc[0]?.lastupdated??"")||
  doc[1].length>200||doc[0].total!==doc[1].length)
  throw Error("Unexpected World Bank series shape");
 const result=new Map();
 for(const x of doc[1]){
  if(x?.indicator?.id!==id||x?.countryiso3code!=="BRA"||
   !/^(?:19|20)\d{2}$/.test(x.date??"")||
   typeof x.date!=="string"||
   (x.value!==null&&(!Number.isFinite(x.value)||typeof x.value!=="number")))
   throw Error("World Bank series schema or country mismatch");
  if(result.has(x.date))throw Error("Duplicate World Bank observation year");
  result.set(x.date,x.value);
 }
 return {values:result,updatedAt:doc[0].lastupdated,total:doc[0].total};
}
const round=x=>Number(x.toFixed(4));
/** Data-level reproducible computation across two official aggregates. */
export function computeBrazilPovertyAggregate({
 povertyDoc,populationDoc,metadata,years=["2022","2023","2024"]
}){
 const indicators=verifyWdiMetadata(metadata);
 if(!Array.isArray(years)||years.length<2||years.length>4||
  new Set(years).size!==years.length||
  years.some(x=>!/^20\d{2}$/.test(x)))
  throw Error("Select 2–4 unique nonfuture years");
 const poverty=uniqueYears(povertyDoc,INDICATORS.poverty);
 const pop=uniqueYears(populationDoc,INDICATORS.population);
 const rows=[];
 for(const year of [...years].sort()){
  const rate=poverty.values.get(year);
  const population=pop.values.get(year);
  if(!Number.isFinite(rate)||rate<0||rate>100||
   !Number.isSafeInteger(population)||population<=0)
   throw Error("No complete same-year published data: "+year);
  rows.push({year,ratePercent:rate,reportedMidyearPopulation:population,
   estimatedPopulationBelowPovertyLine:Math.round(rate/100*population),
   formula:"round(reportedMidyearPopulation * ratePercent / 100)",
   isWorldBankOfficialPoorCount:false,
   rawMicrodataReplicated:false});
 }
 const a=rows[0],b=rows.at(-1);
 return {schema:"hpi_ai6_t073b_official_aggregate_reproduction_v1",
  classification:"DESCRIPTIVE_ARITHMETIC_FROM_TWO_OFFICIAL_SERIES_NOT_CAUSAL_REPLICATION",
  country:"Brazil",countryCode:"BRA",
  dataset:"World Bank World Development Indicators (source 2)",
  indicatorDefinitions:indicators,
  license:WDI_LICENSE,seriesLastUpdated:{
   poverty:poverty.updatedAt,population:pop.updatedAt},
  povertyLine:"$3.00 per person per day (2021 PPP), international line",
  populationDescription:"de facto midyear population estimates",
  rows,comparison:{fromYear:a.year,toYear:b.year,
   rateDifferencePercentagePoints:round(b.ratePercent-a.ratePercent),
   estimatedHeadcountDifference:b.estimatedPopulationBelowPovertyLine-
    a.estimatedPopulationBelowPovertyLine,
   isCausalAttribution:false,isControlledTrialEstimate:false},
  dataReproducibility:{
   officialAggregateObservationsMatched:rows.length,
   numericTransformationsRerunnable:true,
   directlyUsingPublicSourceObservations:true,
   microdataExperimentReplications:0,
   counterfactualOrCausalEffectsIdentified:0,
   uncertaintyIntervalsFromSource:null,
   noCrossVintageComparisonGuaranteed:true
  },
  warnings:[
   "Derived poor headcounts are independent arithmetic approximations, NOT official World Bank published poor-person counts.",
   "Survey poverty rates and midyear national population are different data products; source revisions, survey estimates and comparability limit interpretation.",
   "No experiment, causal treatment effect, statistical significance or exogenous intervention is inferred.",
   "Do not compare 2021 PPP poverty-line rates to older PPP vintages without harmonisation."
  ],scientificPublicationAuthorised:false};
}
export async function reproduceOfficialAggregate({fetchImpl=globalThis.fetch}={}){
 const urls=officialWdiUrls();
 const result=await Promise.all(Object.values(urls).map(
  u=>readOfficialWdiJson(u,{fetchImpl})));
 const failed=result.findIndex(x=>!x.ok);
 if(failed!==-1)throw Error("Official data retrieval failed closed: "+Object.keys(urls)[failed]+": "+result[failed].reason);
 const docs=Object.fromEntries(Object.keys(urls).map((k,i)=>[k,result[i].json]));
 const out=computeBrazilPovertyAggregate({
  povertyDoc:docs.povertySeries,populationDoc:docs.populationSeries,
  metadata:{poverty:docs.povertyMetadata,population:docs.populationMetadata}});
 return {...out,provenance:{
  exactSourceUrls:urls,
  originalResponseDigestsSha256:Object.fromEntries(
   Object.keys(urls).map((k,i)=>[k,result[i].rawSha256])),
  readOnlyPublicApiCalls:4,noCredentials:true,
  noOriginalResponseBodiesPersisted:true,
  sourceSnapshotCheckedAt:new Date().toISOString()
 }};
}
