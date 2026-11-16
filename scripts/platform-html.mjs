/** Shared, escaping-by-default HTML helpers and canonical routes for platform pages. */
import {escapeHtml as safe,slug} from "./site-content.mjs";

export {safe};
export const ROUTE_PREFIX=Object.freeze({problem:"/intelligence/problems/",mechanism:"/intelligence/mechanisms/",
 intervention:"/intelligence/interventions/",context:"/intelligence/contexts/",fact:"/intelligence/facts/"});
export const SOLUTION_ROUTES=Object.freeze({"SOL-BENEFIT-ACCESS-EVALUATION":"/solutions/benefit-access",
 "SOL-ENERGY-AFFORDABILITY-TEMPLATE":"/solutions/energy-affordability","SOL-LIVELIHOODS-TEMPLATE":"/solutions/livelihoods"});
export const idSlug=id=>slug(String(id).replace(/^[A-Z]{1,2}-/,""));
export const routeFor=(kind,id)=>kind==="solution"?SOLUTION_ROUTES[id]:ROUTE_PREFIX[kind]+idSlug(id);
const EXTERNAL=/^https:\/\//;
const FIRST_PARTY=/^\/(?:[a-z0-9][a-z0-9.-]*\/?)*(?:#[a-z0-9-]+)?$/;
/** Link with escaping; external links open in a new tab and are labelled. Unsafe targets render as text. */
export function a(href,label,{download=false}={}){
 if(EXTERNAL.test(href))return '<a href="'+safe(href)+'" target="_blank" rel="noopener noreferrer">'+safe(label)+' ↗</a>';
 if(FIRST_PARTY.test(href)&&!href.includes(".."))return '<a href="'+safe(href)+'"'+(download?" download":"")+'>'+safe(label)+'</a>';
 return safe(label);
}
export const badge=(kind,text)=>'<span class="pf-badge pf-badge-'+safe(kind)+'">'+safe(text)+'</span>';
export const humanize=v=>String(v??"").replaceAll("_"," ");
const DIRECTION_LABEL={supports:"Supportive finding",mixed:"Mixed or heterogeneous",null:"Null finding",adverse:"Adverse finding",descriptive:"Descriptive context"};
export const directionBadge=d=>badge(d,DIRECTION_LABEL[d]||d);
export const mechanismBadge=m=>m.status==="evidence_linked"?badge("evidence","Evidence-linked (abstract level)"):badge("hypothesis","Candidate hypothesis");
export const verificationBadge=v=>v==="byte_hashed_extraction"?badge("evidence","Byte-hashed extraction"):
 v==="publisher_page_transcribed_unhashed"?badge("neutral","Transcribed, not hashed"):badge("neutral","Citation-level only");
export function table(caption,head,rows,{label=caption,className=""}={}){
 return '<div class="doc-table-wrap'+(className?" "+className:"")+'" role="region" tabindex="0" aria-label="'+safe(label)+'"><table>'+
  (caption?'<caption>'+safe(caption)+'</caption>':"")+
  '<thead><tr>'+head.map(h=>'<th scope="col">'+safe(h)+'</th>').join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
}
/** Row helper: cells are trusted HTML fragments built with safe()/a(). First cell is a row header. */
export const tr=(cells,attrs="")=>'<tr'+attrs+'>'+cells.map((c,i)=>i===0?'<th scope="row">'+c+'</th>':'<td>'+c+'</td>').join("")+'</tr>';
export const dataAttrs=obj=>Object.entries(obj).map(([k,v])=>' data-pf-'+k+'="'+safe(String(v))+'"').join("");
export const list=items=>'<ul>'+items.map(x=>'<li>'+x+'</li>').join("")+'</ul>';
export const crumbs=(...parts)=>'<a href="/">Home</a> / <a href="/platform">Platform</a> / '+parts.join(" / ");
export function formatValue(f){
 const n=new Intl.NumberFormat("en-GB",{maximumFractionDigits:1}).format(f.value);
 if(f.unit==="percent")return n+"%";
 if(f.unit==="GBP")return "£"+n;
 if(f.unit==="BRL_per_person_per_month")return "R$"+n+" per person per month";
 if(f.unit==="EUR_per_household_per_month")return "€"+n+" per household per month";
 return n+" "+humanize(f.unit);
}
