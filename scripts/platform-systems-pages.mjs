/**
 * Pillar 4 — Economic Systems Lab, plus the platform hub and its Italian summary.
 * Model outputs are precomputed for the no-JavaScript baseline with the same
 * module that the interactive demonstrator loads in the browser.
 */
import {a,badge,crumbs,humanize,list,safe,table,tr} from "./platform-html.mjs";
import {compareScenarios,sensitivity,thresholdSensitivity,PARAMETER_LABELS} from "../research-tools/household-resilience-model.mjs";

const money=v=>new Intl.NumberFormat("en-GB",{minimumFractionDigits:0,maximumFractionDigits:0}).format(v);
const statusText=s=>'<span class="pf-status-'+safe(s)+'">'+safe(s==="deficit"?"Deficit":s==="fragile"?"Fragile":"Margin")+'</span>';

export function systemsLabResults(lab){
 const scenarios=compareScenarios(lab.archetypes,lab.scenarios,lab.parameterBounds);
 const sens=sensitivity(lab.archetypes,{},lab.parameterBounds);
 const thresholds=thresholdSensitivity(lab.archetypes,{},lab.parameterBounds);
 return {modelId:lab.models[0].id,modelVersion:lab.models[0].version,label:"ILLUSTRATIVE MODEL · SYNTHETIC INPUTS",scenarios,sensitivityAtBaseline:sens,thresholdSensitivity:thresholds};
}

export async function publishSystemsLabAndHub({publish,shell,kb,labResults,pillarStatus}){
 const routes=[];
 const page=async(route,opts)=>{routes.push(route);await publish(route,shell({route,stylesheet:"/platform.css",...opts}))};
 const lab=kb.parsed.systemsLab,model=lab.models[0];
 const arch=new Map(lab.archetypes.map(x=>[x.id,x]));
 const scenarioTables=labResults.scenarios.map(s=>'<h3 id="sc-'+safe(s.id.toLowerCase())+'">'+safe(s.title)+'</h3><p class="pf-small">'+safe(s.description)+'</p>'+
  table("",["Synthetic household","Disposable income","Essential costs","Residual income","Change vs baseline","Essentials share","Status","Buffer months"],s.results.map((r,i)=>tr([safe(r.label),safe(money(r.disposableIncome)),safe(money(r.essentialCosts)),safe(money(r.residualIncome)),
   safe((s.changes[i].residualChange>0?"+":"")+money(s.changes[i].residualChange)),safe(r.essentialsShare===null?"undefined":Math.round(r.essentialsShare*1000)/10+"%"),statusText(r.status),safe(r.bufferMonths===null?"not depleting":String(r.bufferMonths))])),{label:s.title+" results (synthetic)"})+
  '<p class="pf-small">Status counts across the four synthetic types: '+safe(s.statusCounts.deficit+" deficit, "+s.statusCounts.fragile+" fragile, "+s.statusCounts.margin+" margin")+'. These are archetypes, not population shares.</p>').join("");
 const topSens=[...new Set(lab.archetypes.map(x=>x.id))].map(id=>{const rows=labResults.sensitivityAtBaseline.filter(r=>r.archetypeId===id).slice(0,3);
  return tr([safe(arch.get(id).label),rows.map(r=>safe(PARAMETER_LABELS[r.parameter]+": swing "+money(r.swing)+(r.statusChanges?" (status changes)":""))).join("<br>")])});
 const thRows=labResults.thresholdSensitivity.map(t=>tr([safe(Math.round(t.fragilityThreshold*100)+"%"),t.statuses.map(s=>safe(arch.get(s.archetypeId).label)+": "+statusText(s.status)).join("<br>")]));
 const bounds=lab.parameterBounds;
 const inputs=Object.keys(PARAMETER_LABELS).map(k=>{const b=bounds[k],step=k==="passThroughShare"||k==="employmentShareChange"||k==="fragilityThreshold"?"0.01":"1";
  return '<div><label for="sl-'+safe(k)+'">'+safe(PARAMETER_LABELS[k])+'</label><input id="sl-'+safe(k)+'" type="number" data-sl-param="'+safe(k)+'" value="'+(k==="fragilityThreshold"?"0.1":"0")+'" min="'+safe(b[0])+'" max="'+safe(b[1])+'" step="'+step+'" required></div>'}).join("");
 await page("/systems-lab",{
  title:"Economic Systems Lab",section:"Economic Systems Lab",
  description:"An open research programme on how growth, productivity, wages, employment and essential costs translate — or fail to translate — into household security, with a transparent, reproducible illustrative model.",
  breadcrumb:crumbs("Systems Lab"),script:"/systems-lab.js",
  body:'<div class="index-content"><section class="editorial-intro"><span class="eyebrow-dark">PILLAR 4 · SYSTEMS RESEARCH</span><h2>Test competing explanations openly.</h2>'+
  '<p>The Lab investigates economic and institutional mechanisms behind persistent insecurity. It does not promote an economic doctrine, and its first model is a teaching and reasoning instrument, not a forecast.</p></section>'+
  '<div class="pf-synthetic-banner">'+safe(labResults.label)+'. '+safe(kb.parsed.systemsLab.note)+'</div>'+
  '<ul class="pf-toc"><li><a href="#questions">Research questions</a></li><li><a href="#explanations">Competing explanations</a></li><li><a href="#model">Model registry</a></li><li><a href="#demonstrator">Interactive demonstrator</a></li><li><a href="#scenarios">Scenario comparison</a></li><li><a href="#sensitivity">Sensitivity</a></li><li><a href="#gaps">Evidence gaps</a></li></ul>'+
  '<h2 id="questions">Research questions</h2>'+table("",["ID","Question","Evidence needed","Model support"],lab.researchQuestions.map(q=>tr([safe(q.id),safe(q.question),safe(q.evidenceNeeds.join("; ")),safe(q.modelSupport)])),{label:"Research question catalogue"})+
  '<h2 id="explanations">Competing explanations (RQ-ESL-01)</h2><p>Explanations are registered with testable implications so that evidence can discriminate between them. None is assumed correct.</p>'+
  table("",["ID","Explanation","Testable implication","Measurement caveat"],lab.competingExplanations.map(x=>tr([safe(x.id),safe(x.explanation),safe(x.testableImplication),safe(x.measurementCaveat)])),{label:"Competing explanations"})+
  '<h2 id="model">Model registry</h2><dl class="pf-dl"><dt>Model</dt><dd>'+safe(model.id+" · "+model.title+" · v"+model.version)+'</dd><dt>Status</dt><dd>'+badge("synthetic",humanize(model.status))+'</dd><dt>Purpose</dt><dd>'+safe(model.purpose)+'</dd><dt>Source code</dt><dd>'+a(model.module,"Browser-ready ES module (MIT)")+'</dd><dt>Pathway</dt><dd>'+safe(model.pathwayToAdvancedModels)+'</dd></dl>'+
  '<h3>Formulas</h3><ol>'+model.formulas.map(f=>'<li><code>'+safe(f)+'</code></li>').join("")+'</ol>'+
  '<h3>Assumptions</h3>'+list(model.assumptions.map(safe))+'<h3>Limitations</h3>'+list(model.limitations.map(safe))+
  '<h3>Synthetic household archetypes (currency-neutral units per month)</h3>'+table("",["Archetype","Earners (wage × hours × employment share)","Transfers","Tax rate","Housing","Energy","Food","Other essentials","Savings"],lab.archetypes.map(x=>tr([safe(x.label),safe(x.earners.map(e=>e.hourlyWage+" × "+e.monthlyHours+" × "+e.employmentShare).join("; ")||"none"),safe(x.transfers),safe(x.effectiveTaxRate),safe(x.housing),safe(x.energy),safe(x.food),safe(x.otherEssentials),safe(x.savings)])),{label:"Synthetic archetype inputs"})+
  '<h2 id="demonstrator">Interactive demonstrator</h2><p>Choose a preset or set your own assumptions. Calculations run in your browser with the published module; nothing is sent or stored.</p>'+
  '<form class="pf-form" id="sl-form" novalidate><div class="pf-form-grid"><div><label for="sl-preset">Scenario preset</label><select id="sl-preset">'+lab.scenarios.map(s=>'<option value="'+safe(s.id)+'">'+safe(s.title)+'</option>').join("")+'</select></div></div>'+
  '<fieldset><legend>Assumptions</legend><div class="pf-form-grid">'+inputs+'</div></fieldset><div class="pf-actions"><button type="submit">Run illustrative model</button><button type="button" class="secondary" id="sl-reset">Reset to preset</button></div></form>'+
  '<div id="sl-result" class="pf-result" role="status" aria-live="polite" data-state="idle">Requires JavaScript. Precomputed results for every preset are shown below.</div>'+
  '<h2 id="scenarios">Scenario comparison (precomputed, deterministic)</h2><p>Each table shows every synthetic household type separately. HPI does not publish an average, because an average would hide who falls into deficit.</p>'+scenarioTables+
  '<h2 id="sensitivity">Sensitivity</h2><p>One-at-a-time sensitivity around the baseline: each assumption moved down and up by its declared step. Largest swings in residual income:</p>'+
  table("",["Synthetic household","Three most influential assumptions"],topSens,{label:"Top sensitivities per archetype"})+
  '<p>The fragility threshold is an analytical convention. Classification changes with it:</p>'+table("",["Fragility threshold","Status by household type (baseline)"],thRows,{label:"Threshold sensitivity"})+
  '<p>'+a("/systems-lab-results.json","All results and sensitivity rows (JSON)")+' · '+a("/systems-lab-data.json","Model inputs (JSON)")+'</p>'+
  '<h2>What the illustrative scenarios show — and do not show</h2>'+list(["Growth with low pass-through can lower residual income for every synthetic type when essential costs rise faster than pay: a reminder that aggregate growth and household security can diverge arithmetically.","An essential-cost shock pushes the fixed-income pension-age archetype into deficit while the middle-income archetype keeps a margin: distributional effects differ even under one shock.","These are consequences of the assumptions, not findings about any economy. Real outcomes depend on behaviour, institutions and prices that the model deliberately excludes."].map(safe))+
  '<h2 id="gaps">Evidence gaps and established datasets</h2>'+list(lab.evidenceGaps.map(safe))+
  '<p>Datasets for future calibration (linked, not ingested):</p>'+list(lab.establishedDatasets.map(d=>a(d.url,d.name)+" — "+safe(humanize(d.status))))+
  '<p>'+a("/library/docs/platform/economic-systems-lab-model-v1","Full model documentation, assumptions and review pathway")+'</p></div>'
 });

 // ---------- Platform hub ----------
 const pillars=[
  ["/intelligence","Global Prosperity Intelligence","Problems, recurring mechanisms, evidence and contexts in a navigable, source-traceable knowledge base."],
  ["/solutions","Solutions & Experimentation Engine","Reusable intervention and evaluation designs, starting with verified receipt of benefits in three contexts."],
  ["/adopt","Global Adoption Network","Licensed, downloadable methods and templates with maturity levels and a readiness self-check."],
  ["/systems-lab","Economic Systems Lab","Open research on why growth does not always become household security, with a reproducible illustrative model."]
 ];
 const chain=[["Global evidence","Published studies and official statistics, cited with provenance."],["Recurring mechanisms","Barriers that may operate across many contexts, labelled as evidence-linked or hypothesis."],
  ["Credible solution designs","Intervention hypotheses with measurement plans, harms and approval gates."],["Independent evaluation","Studies run and reviewed by accountable, independent institutions."],
  ["Local adaptation","Institutions and communities adapt methods to their own rules and people."],["Verified changes in people’s lives","Measured, durable improvements — never assumed from reach or applications."]];
 await page("/platform",{
  title:"The Global Prosperity Platform",section:"Platform",
  description:"How HPI moves from isolated case studies to reusable knowledge, methods and software: four connected pillars, what works today and what still needs independent approval.",
  breadcrumb:'<a href="/">Home</a> / Platform',
  body:'<div class="index-content"><section class="editorial-intro"><span class="eyebrow-dark">UNIVERSAL AMBITION · FOCUSED EXECUTION · VERIFIABLE IMPACT</span><h2>Reusable knowledge instead of one-off projects.</h2>'+
  '<p>Studying one city at a time can produce good research but rarely scales. HPI now looks for recurring mechanisms — such as administrative burden in benefit access — and builds open methods that qualified institutions can scrutinise and adapt. HPI’s value should be measured by independently verified improvement it helps others achieve, not by how many projects it runs.</p></section>'+
  '<div class="pf-pillars">'+pillars.map(([href,t,d],i)=>'<article class="pf-pillar"><span class="pf-kicker">Pillar '+(i+1)+'</span><h2><a href="'+href+'">'+safe(t)+'</a></h2><p>'+safe(d)+'</p><p class="pf-foot">'+safe(pillarStatus[i])+'</p></article>').join("")+'</div>'+
  '<h2>Theory of change</h2><ol class="pf-chain">'+chain.map(([t,d],i)=>'<li><span>'+(i+1)+'</span><div><strong>'+safe(t)+'</strong><small>'+safe(d)+'</small></div></li>').join("")+'</ol>'+
  '<p>Steps 1–3 are desk research and software that HPI can do now. Steps 4–6 depend on independent institutions, legal authority, ethics approval and communities. AI can make steps 1–3 cheaper; it cannot make steps 4–6 happen. '+a("/library/docs/platform/theory-of-change-v0-1","Read the full theory of change")+'</p>'+
  '<h2>What exists today</h2>'+table("",["Level","Status in November 2026"],[
   tr(["Technical reach",safe("Public website with knowledge base, solution designs, adoption toolkit and model; automated tests and accessibility checks.")]),
   tr(["Research usefulness",safe("Source-traceable desk research across three contexts and three problem families; not independently reviewed.")]),
   tr(["Adoption",safe("None. No organisation has adopted, endorsed or partnered with HPI.")]),
   tr(["Demonstrated human benefit",safe("None. No intervention, participant or measured outcome exists.")])
  ],{label:"Distinguishing reach, usefulness, adoption and benefit"})+
  '<h2>Open approvals</h2><p>Founding charter ratification, independent methodology review, a lawful operating structure, safeguarding and confidential reporting, an accountable data controller, privacy review, human accessibility testing, partner authorisation and fieldwork approval all remain open. '+a("/research/responsible-tools","See the governance gates")+' · '+a("/roadmap","Roadmap")+'</p>'+
  '<h2>Strategy documents</h2>'+list([["/library/docs/platform/strategic-operating-model-v0-1","Strategic operating model and four-pillar architecture"],["/library/docs/platform/theory-of-change-v0-1","Theory of change"],["/library/docs/decisions/0004-global-prosperity-platform-architecture","ADR-0004: platform architecture"],["/library/docs/platform/current-state-audit-2026-11-16","Current-state audit, 16 November 2026"]].map(([u,l])=>a(u,l)))+
  '<p lang="it"><a href="/platform/it" hreflang="it">Leggi la sintesi in italiano</a></p></div>'
 });
 await page("/platform/it",{
  title:"La piattaforma globale per la prosperità",section:"Piattaforma",lang:"it",
  description:"Sintesi in italiano dei quattro pilastri della piattaforma HPI, di ciò che funziona oggi e delle approvazioni ancora mancanti.",
  breadcrumb:'<a href="/">Home</a> / <a href="/platform" hreflang="en" lang="en">Platform</a> / Italiano',
  body:'<div class="index-content"><p><a href="/platform" hreflang="en" lang="en">Read in English</a></p>'+
  '<p class="status-note"><strong>Traduzione parziale, non revisionata da terzi.</strong> Solo questa pagina di sintesi è disponibile in italiano; gli strumenti e i dati della piattaforma sono in inglese.</p>'+
  '<h2>Dalla singola città alla conoscenza riutilizzabile</h2><p>HPI non intende più studiare un problema locale alla volta. Cerca meccanismi ricorrenti — per esempio gli ostacoli amministrativi nell’accesso alle prestazioni — e sviluppa metodi aperti che istituzioni qualificate possano verificare e adattare.</p>'+
  '<h2>I quattro pilastri</h2><ol>'+
  '<li><strong>Intelligence sulla prosperità globale</strong> — problemi, meccanismi, evidenze e contesti con fonti tracciabili. <a href="/intelligence" hreflang="en" lang="en">Intelligence</a></li>'+
  '<li><strong>Motore di soluzioni e sperimentazione</strong> — progetti di valutazione riutilizzabili, a partire dalla ricezione verificata delle prestazioni a Newham, Recife e Napoli. <a href="/solutions" hreflang="en" lang="en">Solutions</a></li>'+
  '<li><strong>Rete globale di adozione</strong> — risorse scaricabili con licenze, livelli di maturità e autovalutazione della preparazione. <a href="/adopt" hreflang="en" lang="en">Adopt</a></li>'+
  '<li><strong>Laboratorio sui sistemi economici</strong> — ricerca aperta su crescita, salari e sicurezza delle famiglie, con un modello illustrativo riproducibile basato su dati sintetici. <a href="/systems-lab" hreflang="en" lang="en">Systems Lab</a></li></ol>'+
  '<h2>Che cosa esiste davvero</h2><ul><li>Software e ricerca documentale pubblici, testati automaticamente.</li><li>Nessuna adozione, nessun partner, nessun intervento e nessun beneficio misurato per le persone.</li><li>L’assistenza basata su intelligenza artificiale non è collegata ad alcun modello in produzione.</li></ul>'+
  '<h2>Approvazioni ancora mancanti</h2><p>Ratifica della carta fondativa, revisione metodologica indipendente, struttura giuridica, tutela e segnalazione riservata, titolare del trattamento dei dati, verifica dell’accessibilità con persone reali, autorizzazioni dei partner e del lavoro sul campo.</p>'+
  '<p><a href="/mission/it">Carta fondativa (bozza V0.3, non ratificata)</a> · <a href="/research/responsible-tools/it">Etica e strumenti di ricerca</a></p></div>'
 });
 return routes;
}
