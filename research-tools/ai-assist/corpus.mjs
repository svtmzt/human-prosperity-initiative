/**
 * Research inputs for AI assistance, built from the validated, already
 * published HPI knowledge base. Each source carries a data classification and
 * the basis for it so the routing policy can decide where it may be sent.
 */
import {parseCsv} from "../../scripts/site-content.mjs";

export const LEDGER_DATA_CLASS_BASIS="HPI-authored abstract-level summary already published on the HPI website (CC BY 4.0); third-party figures are attributed citations; no publisher full text. Qualified licence review (G-03) remains open.";
export const DOSSIER_DATA_CLASS_BASIS="HPI-composed list of figures already published with attribution on HPI context pages; per-figure redistribution status is recorded in research/platform/context-facts.json. Qualified licence review (G-03) remains open.";

const toObjects=csv=>{const [head,...rows]=parseCsv(csv);return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]])))};

/** Evidence-ledger records as AI input sources (public research metadata). */
export function ledgerSources({ledgerCsv,structuredCsv}){
 const ledger=toObjects(ledgerCsv);
 const structured=new Map(toObjects(structuredCsv).map(r=>[r.source_id,r]));
 return ledger.map(r=>{const s=structured.get(r.id);
  return {id:r.id,url:r.url,structured:s||null,ledgerRow:{source_type:r.source_type,key_finding:r.key_finding},dataClass:"public_research_metadata",dataClassBasis:LEDGER_DATA_CLASS_BASIS,
   text:[r.key_finding,s?.finding_verified_from_abstract_or_summary,s?.measured_endpoint?"Measured endpoint: "+s.measured_endpoint:"","Limitations: "+r.limitations].filter(Boolean).join(" ")}});
}

const fmt=v=>typeof v==="number"?v.toLocaleString("en-GB",{maximumFractionDigits:2}):String(v);
const UNIT={percent:"percent",households:"households",persons:"persons",residents:"residents",GBP:"GBP"};

/**
 * A context dossier lists every published figure for a local context and its
 * wider geographies (up to national level), WITHOUT stage labels and WITHOUT
 * the declared gap records, so a model must infer coverage from the figures.
 */
export function contextDossier(kb,contextId,programmeId){
 const ctx=kb.ctx.get(contextId);
 if(!ctx)throw new Error("Unknown context "+contextId);
 const chain=[];let cur=ctx;
 while(cur&&cur.type!=="global"&&cur.id!=="GLOBAL"){chain.push(cur);cur=cur.parent?kb.ctx.get(cur.parent):null}
 const names=new Map(chain.map(c=>[c.id,c.name]));
 const prog=kb.progs.get(programmeId);
 const facts=[...kb.facts.values()].filter(f=>names.has(f.contextId)&&(f.programmeId===programmeId||f.programmeId==null))
  .sort((a,b)=>(a.contextId===contextId?0:1)-(b.contextId===contextId?0:1)||a.id.localeCompare(b.id));
 const lines=facts.map(f=>"- Geography: "+names.get(f.contextId)+" ("+f.geographyLevel.replace(/_/g," ")+"). "+f.label+": "+fmt(f.value)+" "+(UNIT[f.unit]||String(f.unit).replace(/_/g," "))+
  " ("+f.referencePeriod.label+"; "+f.sourceOrganization+").");
 const text="Context: "+ctx.name+". Programme: "+(prog?.name||programmeId)+". Published figures held by HPI for this context and its wider geographies:\n"+(lines.length?lines.join("\n"):"- No figures are held.");
 return {id:"DOSSIER-"+contextId,url:null,text,dataClass:"public_research_metadata",dataClassBasis:DOSSIER_DATA_CLASS_BASIS,
  contextId,contextName:ctx.name,programmeId,factIds:facts.map(f=>f.id)};
}
