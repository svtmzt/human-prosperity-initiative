/**
 * Pillar 1 — Global Prosperity Intelligence. Static, first-party pages generated
 * from the validated knowledge base. No rankings, no aggregate scores, no
 * personal data; every figure links to its provenance.
 */
import {a,badge,crumbs,dataAttrs,directionBadge,formatValue,humanize,list,mechanismBadge,routeFor,safe,table,tr,verificationBadge} from "./platform-html.mjs";
import {compareMeasures,rateComparabilityMatrix,stageCoverage} from "../research-tools/prosperity-platform.mjs";
import {assessCandidate,weightSensitivity} from "../research-tools/opportunity-assessment.mjs";

const SECTION="Global Prosperity Intelligence";
const I_CRUMB='<a href="/intelligence">Intelligence</a>';
const STAGE_TITLE={potentially_eligible:"Potentially eligible",applied:"Applied",approved:"Approved",received:"Benefit received",sustained_improvement:"Sustained economic improvement"};

function claimRows(kb,ids){
 return ids.map(id=>{const c=kb.claims.get(id),r=kb.catalog.get(c.evidenceId);
  return tr([safe(c.id),safe(c.statement),directionBadge(c.direction),safe(humanize(c.endpointLevel)),
   safe(r.geography+" · "+r.year),a(r.sourceUrl,"Source "+r.id),safe(c.transferabilityNote)]);});
}
const CLAIM_HEAD=["Claim","Finding as recorded (abstract level)","Direction","Endpoint level","Study setting","Source","Transferability limit"];
function findingsFor(audit,ids){
 const set=new Set(ids);
 const f=audit.filter(x=>set.has(x.entityId)||x.relatedIds.some(id=>set.has(id))&&["non_independent_studies","older_evidence"].includes(x.type));
 return f.length?'<h2>Automated consistency notes (deterministic, not AI)</h2>'+list(f.map(x=>badge(x.severity==="caution"?"mixed":"neutral",humanize(x.type))+" "+safe(x.message))):"";
}

export async function publishIntelligence({publish,shell,kb,audit,assessment,exportsInfo,aiStatus}){
 const routes=[];
 const page=async(route,opts)=>{routes.push(route);await publish(route,shell({route,section:SECTION,stylesheet:"/platform.css",...opts}))};
 const p=kb.parsed;
 const mechanisms=[...kb.mechanisms.values()],interventions=[...kb.interventions.values()],problems=[...kb.problems.values()];
 const contexts=[...kb.ctx.values()],facts=[...kb.facts.values()];
 const fam=id=>kb.families.get(id)?.title||id;

 // ---------- Overview with explorer ----------
 const explorerItems=[
  ...problems.map(x=>({type:"problem",id:x.id,title:x.title,text:x.summary,family:x.familyId,status:"problem",url:routeFor("problem",x.id)})),
  ...mechanisms.map(x=>({type:"mechanism",id:x.id,title:x.title,text:x.description,family:x.familyId,status:x.status,url:routeFor("mechanism",x.id)})),
  ...interventions.map(x=>({type:"intervention",id:x.id,title:x.title,text:x.description,family:x.familyId,status:"intervention_hypothesis",url:routeFor("intervention",x.id)})),
  ...contexts.map(x=>({type:"context",id:x.id,title:x.name,text:x.summary,family:"all",status:x.role,url:routeFor("context",x.id)}))
 ];
 const statusLabel={problem:"Problem definition",evidence_linked:"Evidence-linked mechanism",candidate_hypothesis:"Candidate hypothesis",intervention_hypothesis:"Intervention hypothesis"};
 const explorer='<section aria-labelledby="pf-explore"><h2 id="pf-explore">Explore problems, mechanisms, interventions and contexts</h2>'+
  '<div data-pf-explorer><form class="pf-controls" role="search" aria-label="Filter the knowledge base" data-pf-controls>'+
  '<div><label for="pf-q">Search</label><input id="pf-q" type="search" maxlength="120" data-pf-filter="search" placeholder="e.g. procedural, energy, Recife"></div>'+
  '<div><label for="pf-type">Record type</label><select id="pf-type" data-pf-filter="type"><option value="all">All types</option><option value="problem">Problems</option><option value="mechanism">Mechanisms</option><option value="intervention">Intervention hypotheses</option><option value="context">Contexts</option></select></div>'+
  '<div><label for="pf-family">Problem family</label><select id="pf-family" data-pf-filter="family"><option value="all">All families</option>'+[...kb.families.values()].map(f=>'<option value="'+safe(f.id)+'">'+safe(f.title)+'</option>').join("")+'</select></div>'+
  '<div><label for="pf-status">Evidence status</label><select id="pf-status" data-pf-filter="status"><option value="all">Any status</option><option value="evidence_linked">Evidence-linked mechanisms</option><option value="candidate_hypothesis">Candidate hypotheses</option></select></div>'+
  '</form><p data-pf-count role="status" aria-live="polite">'+explorerItems.length+' records</p>'+
  '<p data-pf-empty class="status-note" hidden>No records match these filters. Clear a filter to see more; nothing has been removed.</p>'+
  '<ul class="pf-list">'+explorerItems.map(x=>'<li data-pf-item'+dataAttrs({type:x.type,family:x.family,status:x.status,search:[x.id,x.title,x.text].join(" ")})+'>'+
   '<span class="pf-kicker">'+safe(x.type)+'</span> '+(x.type==="mechanism"?mechanismBadge(kb.mechanisms.get(x.id)):x.type==="context"?badge("neutral",humanize(x.status)):badge("neutral",statusLabel[x.status]||humanize(x.status)))+
   '<br><a class="pf-item-title" href="'+safe(x.url)+'">'+safe(x.title)+'</a><p>'+safe(x.text)+'</p></li>').join("")+'</ul></div></section>';
 const caution=audit.filter(f=>f.severity==="caution").length;
 await page("/intelligence",{
  title:"Global Prosperity Intelligence",
  description:"Navigate prosperity problems, recurring mechanisms, intervention hypotheses, evidence and contexts — with provenance, uncertainty and explicit evidence gaps. No rankings or aggregate scores.",
  breadcrumb:crumbs("Intelligence"),script:"/platform-explorer.js",
  body:'<div class="index-content">'+
  '<section class="editorial-intro"><span class="eyebrow-dark">PILLAR 1 · DESK RESEARCH KNOWLEDGE BASE</span><h2>Connect problems, mechanisms and evidence.</h2>'+
  '<p>This is a small, reproducible, source-traceable knowledge base — not a worldwide dashboard. It links '+problems.length+' problem definitions, '+mechanisms.length+' mechanisms, '+interventions.length+' intervention hypotheses and '+kb.claims.size+' abstract-level evidence claims to '+contexts.length+' contexts with '+facts.length+' published figures and '+kb.gaps.size+' declared measurement gaps.</p>'+
  '<p class="status-note"><strong>What this is not:</strong> not an impact assessment, not a global ranking, not an eligibility tool and not a replacement for independent review. Coverage is deliberately limited to sources HPI has examined.</p></section>'+
  '<h2>Five ways to use it</h2><ol class="project-steps">'+
  '<li><strong>Explore a problem:</strong> start from a <a href="#pf-explore">problem family</a> and follow its mechanisms, evidence and uncertainties.</li>'+
  '<li><strong>Compare contexts:</strong> see Newham, Recife and Naples side by side in the <a href="/intelligence/compare">comparison view</a>, with warnings where measures are not comparable.</li>'+
  '<li><strong>Inspect an evidence trail:</strong> go from any claim or figure to its <a href="/intelligence/evidence">source, definition, date and transformation</a>.</li>'+
  '<li><strong>Discover possible solutions:</strong> move from a mechanism to intervention hypotheses and the <a href="/solutions">Solutions & Experimentation Engine</a>.</li>'+
  '<li><strong>Reuse the research:</strong> download machine-readable data and reproduce the build from the <a href="/intelligence/data">data & reuse page</a>.</li></ol>'+
  '<h2>Prosperity dimensions (F0-03 draft)</h2>'+table("",["Dimension","What it covers","Measurement pitfall"],p.taxonomy.dimensions.map(d=>tr([safe(d.title),safe(d.summary),safe(d.measurementPitfall)])),{label:"Five draft prosperity dimensions"})+
  '<p class="pf-small">No dimension compensates for severe deprivation in another. HPI does not compute a combined prosperity score.</p>'+
  '<h2>Problem families</h2><div class="pf-pillars">'+[...kb.families.values()].map(f=>'<article class="pf-pillar"><span class="pf-kicker">'+safe(f.id)+'</span><h3>'+safe(f.title)+'</h3><p>'+safe(f.summary)+'</p><p class="pf-small">'+safe(f.pillarRole)+'</p></article>').join("")+'</div>'+
  explorer+
  '<h2>Reliability at a glance</h2><ul>'+
  '<li>'+safe(String(caution))+' automated cautions (conflicting evidence or intermediate-only endpoints) — see <a href="/intelligence/methods#consistency">consistency audit</a>.</li>'+
  '<li>'+safe(String(facts.filter(f=>f.verificationLevel==="byte_hashed_extraction").length))+' of '+facts.length+' figures are byte-hashed extractions; the rest are transcribed citations with declared missing provenance.</li>'+
  '<li>AI assistance: <strong>'+safe(aiStatus.productionInference?"connected":"not connected")+'</strong>. '+a("/intelligence/ai-assistance","What this means")+'.</li></ul></div>'
 });

 // ---------- Problems ----------
 for(const x of problems){
  const ints=[...new Set(x.mechanisms.flatMap(m=>kb.graph.interventionsByMechanism.get(m)||[]))];
  const claims=kb.graph.claimsByProblem.get(x.id)||[];
  const sols=kb.graph.solutionsByProblem.get(x.id)||[];
  await page(routeFor("problem",x.id),{
   title:x.title,description:x.summary.slice(0,300),breadcrumb:crumbs(I_CRUMB,"Problems",safe(x.id)),
   body:'<div class="index-content"><p>'+badge("neutral",fam(x.familyId))+' '+badge("neutral","Problem definition, not a diagnosis")+'</p>'+
   '<p>'+safe(x.summary)+'</p>'+
   '<h2>Prosperity dimensions</h2>'+list(x.dimensions.map(d=>safe(kb.dims.get(d).title)))+
   '<h2>Who may be affected</h2>'+list(x.affectedPopulations.map(safe))+
   '<h2>Contexts</h2>'+(x.contexts.length?list(x.contexts.map(id=>a(routeFor("context",id),kb.ctx.get(id).name))):'<p>No context recorded yet.</p>')+
   '<h2>Mechanisms that may explain it</h2>'+list(x.mechanisms.map(id=>{const m=kb.mechanisms.get(id);return a(routeFor("mechanism",id),m.title)+" "+mechanismBadge(m)}))+
   '<h2>Intervention hypotheses linked through those mechanisms</h2>'+(ints.length?list(ints.map(id=>a(routeFor("intervention",id),kb.interventions.get(id).title))):'<p>None linked.</p>')+
   '<h2>Evidence claims ('+claims.length+')</h2>'+(claims.length?table("",CLAIM_HEAD,claimRows(kb,claims),{label:"Evidence claims for "+x.title}):'<p class="status-note">No evidence claims are linked to this problem yet.</p>')+
   '<h2>Uncertainties</h2>'+list(x.uncertainties.map(safe))+
   '<h2>Evidence gaps</h2>'+list(x.evidenceGaps.map(safe))+
   (sols.length?'<h2>Solution packages</h2>'+list(sols.map(id=>a(routeFor("solution",id),kb.solutions.get(id).title))):"")+
   '<h2>Source research</h2>'+list(x.researchDocuments.map(u=>a(u,u)))+'</div>'
  });
 }
 // ---------- Mechanisms ----------
 for(const m of mechanisms){
  const claims=kb.graph.claimsByMechanism.get(m.id)||[];
  const ints=kb.graph.interventionsByMechanism.get(m.id)||[];
  const probs=kb.graph.problemsByMechanism.get(m.id)||[];
  const sols=kb.graph.solutionsByMechanism.get(m.id)||[];
  await page(routeFor("mechanism",m.id),{
   title:m.title,description:m.description.slice(0,300),breadcrumb:crumbs(I_CRUMB,"Mechanisms",safe(m.id)),
   body:'<div class="index-content"><p>'+mechanismBadge(m)+' '+badge("neutral",fam(m.familyId))+'</p><p>'+safe(m.description)+'</p>'+
   (m.status==="candidate_hypothesis"?'<p class="pf-warning"><strong>Hypothesis.</strong> No evidence claim is linked to this mechanism yet. It is a research question, not an established finding.</p>':
    '<p class="status-note">"Evidence-linked" means abstract-level studies are attached. It does not establish that this mechanism operates in any HPI context.</p>')+
   '<h2>Problems it may help explain</h2>'+(probs.length?list(probs.map(id=>a(routeFor("problem",id),kb.problems.get(id).title))):'<p>None linked.</p>')+
   '<h2>Recurrence across contexts</h2>'+(m.recurrence.length?table("",["Context","Status","What is documented"],m.recurrence.map(r=>tr([a(routeFor("context",r.contextId),kb.ctx.get(r.contextId).name),badge(r.status==="not_assessed"?"neutral":"hypothesis",humanize(r.status)),safe(r.note)])),{label:"Recurrence of "+m.title}):'<p>Not yet assessed for specific contexts.</p>')+
   '<p class="pf-small">Recurrence statuses: '+Object.entries(p.mechanisms.recurrenceStatuses).map(([k,v])=>"<strong>"+safe(humanize(k))+"</strong> — "+safe(v)).join(" ")+'</p>'+
   '<h2>Evidence claims ('+claims.length+')</h2>'+(claims.length?table("",CLAIM_HEAD,claimRows(kb,claims),{label:"Evidence claims for "+m.title}):'<p>None.</p>')+
   '<h2>Intervention hypotheses targeting it</h2>'+(ints.length?list(ints.map(id=>a(routeFor("intervention",id),kb.interventions.get(id).title))):'<p>None linked.</p>')+
   (sols.length?'<h2>Solution packages</h2>'+list(sols.map(id=>a(routeFor("solution",id),kb.solutions.get(id).title))):"")+
   findingsFor(audit,[m.id,...claims.map(c=>kb.claims.get(c).evidenceId)])+
   '<h2>Open questions</h2>'+list(m.openQuestions.map(safe))+'</div>'
  });
 }
 // ---------- Interventions ----------
 for(const x of interventions){
  const claims=kb.graph.claimsByIntervention.get(x.id)||[];
  await page(routeFor("intervention",x.id),{
   title:x.title,description:x.description.slice(0,300),breadcrumb:crumbs(I_CRUMB,"Interventions",safe(x.id)),
   body:'<div class="index-content"><p>'+badge("hypothesis","Intervention hypothesis — not implemented or validated by HPI")+' '+badge("neutral",fam(x.familyId))+'</p><p>'+safe(x.description)+'</p>'+
   '<h2>HPI interpretation of the linked evidence</h2><p class="status-note"><strong>Interpretation, not evidence:</strong> '+safe(x.hpiInterpretation)+'</p>'+
   '<h2>Mechanisms targeted</h2>'+list(x.mechanisms.map(id=>a(routeFor("mechanism",id),kb.mechanisms.get(id).title)))+
   '<h2>Evidence claims ('+claims.length+')</h2>'+(claims.length?table("",CLAIM_HEAD,claimRows(kb,claims),{label:"Evidence claims for "+x.title}):'<p>None.</p>')+
   '<h2>Potential harms</h2>'+list(x.potentialHarms.map(safe))+
   '<h2>Costs</h2><p>'+safe(x.costNote)+'</p><h2>Context dependence</h2><p>'+safe(x.contextDependence)+'</p>'+
   findingsFor(audit,[x.id])+'</div>'
  });
 }
 // ---------- Contexts ----------
 for(const x of contexts){
  const fs=kb.graph.factsByContext.get(x.id)||[],gs=kb.graph.gapsByContext.get(x.id)||[];
  const children=kb.graph.childrenByContext.get(x.id)||[];
  const recurring=mechanisms.filter(m=>m.recurrence.some(r=>r.contextId===x.id));
  const programmes=x.programmes.map(id=>kb.progs.get(id));
  await page(routeFor("context",x.id),{
   title:x.name,description:x.summary.slice(0,300),breadcrumb:crumbs(I_CRUMB,"Contexts",safe(x.id)),
   body:'<div class="index-content"><p>'+badge("neutral",humanize(x.role))+' '+badge("nogo","Fieldwork: NO-GO")+'</p><p>'+safe(x.summary)+'</p>'+
   (x.parent?'<p>Part of: '+a(routeFor("context",x.parent),kb.ctx.get(x.parent).name)+'</p>':"")+
   (children.length?'<p>Includes: '+children.map(id=>a(routeFor("context",id),kb.ctx.get(id).name)).join(", ")+'</p>':"")+
   programmes.map(g=>'<h2>'+safe(g.name)+'</h2><p>'+safe(g.eligibilityNote)+' Administered by '+safe(g.administeredBy)+'.</p>'+
    table("",["Outcome stage","Pathway step","Coverage in HPI records"],stageCoverage(kb,x.id,g.id).map(s=>{
     const step=g.pathway.find(st=>st.stage===s.stage);
     const cov=s.localFacts.length?s.localFacts.map(id=>a(routeFor("fact",id),formatValue(kb.facts.get(id))+" — "+kb.facts.get(id).label)).join("<br>"):
      s.widerGeographyFacts.length?badge("gap","Only a wider-geography figure")+" "+s.widerGeographyFacts.map(id=>a(routeFor("fact",id),kb.facts.get(id).label)).join("<br>"):
      s.gaps.length?s.gaps.map(id=>badge("gap",humanize(kb.gaps.get(id).status))+" "+safe(kb.gaps.get(id).reason)).join("<br>"):badge("gap","Not recorded");
     return tr([safe(STAGE_TITLE[s.stage]),safe(step?.description||""),cov]);
    }),{label:g.name+" outcome stages"})).join("")+
   '<h2>Published figures ('+fs.length+')</h2>'+(fs.length?table("",["Figure","Value","Period","Method","Verification"],fs.map(id=>{const f=kb.facts.get(id);
    return tr([a(routeFor("fact",id),f.label),safe(formatValue(f)),safe(f.referencePeriod.label),safe(humanize(f.method)),verificationBadge(f.verificationLevel)])}),{label:"Figures for "+x.name}):'<p>No figures recorded for this context.</p>')+
   (gs.length?'<h2>Declared measurement gaps ('+gs.length+')</h2>'+table("",["Gap","Stage","Status","Access gate"],gs.map(id=>{const g=kb.gaps.get(id);return tr([safe(g.reason),safe(STAGE_TITLE[g.stage]),badge("gap",humanize(g.status)),safe(g.accessGate)])}),{label:"Measurement gaps for "+x.name}):"")+
   (recurring.length?'<h2>Mechanisms assessed here</h2>'+list(recurring.map(m=>{const r=m.recurrence.find(r=>r.contextId===x.id);return a(routeFor("mechanism",m.id),m.title)+" — "+safe(humanize(r.status))})):"")+
   '<h2>HPI research for this context</h2>'+list(x.hpiResearch.map(u=>a(u,u)))+'</div>'
  });
 }
 // ---------- Facts (evidence trail) ----------
 const allPairs=[];
 for(let i=0;i<facts.length;i++)for(let j=i+1;j<facts.length;j++)allPairs.push(compareMeasures(facts[i],facts[j]));
 for(const f of facts){
  const related=allPairs.filter(x=>(x.factA===f.id||x.factB===f.id)&&kb.facts.get(x.factA).contextId===kb.facts.get(x.factB).contextId||
   (x.factA===f.id||x.factB===f.id)&&kb.facts.get(x.factA).measureType==="rate"&&kb.facts.get(x.factB).measureType==="rate");
  const corrections=p.corrections.items.filter(c=>c.affectedEntityIds.includes(f.id));
  const field=(k,v)=>'<dt>'+safe(k)+'</dt><dd>'+v+'</dd>';
  await page(routeFor("fact",f.id),{
   title:f.label,description:"Provenance for a published figure: "+f.label+" ("+kb.ctx.get(f.contextId).name+", "+f.referencePeriod.label+").",
   breadcrumb:crumbs(I_CRUMB,'<a href="/intelligence/evidence">Evidence trail</a>',safe(f.id)),
   body:'<div class="index-content"><div class="fact-strip"><div><strong>'+safe(formatValue(f))+'</strong><span>'+safe(f.referencePeriod.label)+'</span></div><div><strong>'+safe(kb.ctx.get(f.contextId).name)+'</strong><span>'+safe(humanize(f.geographyLevel))+'</span></div><div><strong>'+safe(humanize(f.method))+'</strong><span>'+safe(f.sourceOrganization)+'</span></div></div>'+
   '<p class="pf-warning"><strong>Interpretation guard:</strong> '+safe(f.interpretationGuard)+'</p>'+
   '<h2>Provenance record</h2><dl class="pf-dl">'+
   field("Stable identifier",'<code>'+safe(f.id)+'</code>')+field("Measure definition",'<code>'+safe(f.measureDefinitionId)+'</code>')+
   field("Population",safe(f.populationDefinition)+" ("+safe(humanize(f.populationUnit))+")")+
   field("Numerator",f.numerator?safe(f.numerator.value)+(f.numerator.factId?" — "+a(routeFor("fact",f.numerator.factId),f.numerator.factId):""):"Not applicable or not published")+
   field("Denominator",f.denominator?safe(f.denominator.value)+(f.denominator.factId?" — "+a(routeFor("fact",f.denominator.factId),f.denominator.factId):" — "+safe(f.denominator.description||"")):"Not applicable or not published")+
   field("Source",a(f.sourceUrl,f.sourceOrganization)+(f.sourcePage&&f.sourcePage!==f.sourceUrl?" · "+a(f.sourcePage,"publisher page"):""))+
   field("Source version",safe(f.sourceVersion))+field("Publication date",safe(f.publicationDate||"Not recorded (declared below)"))+
   field("Retrieved",safe(f.retrievedAt||"Not recorded"))+field("Verification",verificationBadge(f.verificationLevel)+(f.sourceSha256?' SHA-256 <code>'+safe(f.sourceSha256)+'</code> · '+safe(f.sourceBytes)+' bytes':""))+
   field("Transformation",safe(f.transformation))+field("Licence",safe(f.licence))+field("Redistribution",safe(humanize(f.redistributionStatus))+" · review: "+safe(humanize(f.licenceReviewStatus)))+
   field("Uncertainty",safe(f.uncertainty))+field("Missingness",safe(f.missingness))+field("Limitations",safe(f.limitations))+
   field("Review status",safe(humanize(f.reviewStatus)))+field("Underlying HPI record",a(f.provenanceRecord,f.provenanceRecord))+
   '</dl>'+
   (f.missingProvenance.length?'<h2>Declared missing provenance</h2>'+table("",["Field","Reason"],f.missingProvenance.map(m=>tr([safe(m.field),safe(m.reason)])),{label:"Declared missing provenance"}):'<p>All provenance fields are recorded.</p>')+
   (related.length?'<h2>Comparability with related figures</h2>'+table("",["Other figure","Directly comparable?","Why not"],related.map(x=>{const other=x.factA===f.id?x.factB:x.factA;
    return tr([a(routeFor("fact",other),kb.facts.get(other).label),x.comparable?badge("evidence","Yes"):badge("gap","No"),x.reasons.map(r=>safe(r.dimension)).join(", ")||"—"])}),{label:"Comparability with related figures"}):"")+
   (corrections.length?'<h2>Corrections</h2>'+list(corrections.map(c=>safe(c.date+" — "+c.description))):"")+'</div>'
  });
 }

 // ---------- Compare contexts ----------
 const focus=["UK-NEWHAM","BR-RECIFE","IT-NAPLES"];
 const sol=kb.solutions.get("SOL-BENEFIT-ACCESS-EVALUATION");
 const coverage=focus.map(id=>{const ad=sol.localAdaptations.find(x=>x.contextId===id);return {id,ad,rows:stageCoverage(kb,id,ad.programmeId)}});
 const cell=(row)=>row.localFacts.length?row.localFacts.map(id=>{const f=kb.facts.get(id);return '<strong>'+safe(formatValue(f))+'</strong> '+a(routeFor("fact",id),f.label)+'<br><span class="pf-small">'+safe(f.referencePeriod.label+" · "+humanize(f.method))+'</span>'}).join("<br>"):
  row.widerGeographyFacts.length?badge("gap","No local figure")+'<br><span class="pf-small">Wider geography only: </span>'+row.widerGeographyFacts.map(id=>a(routeFor("fact",id),kb.facts.get(id).label)).join("<br>"):
  row.gaps.map(id=>badge("gap",humanize(kb.gaps.get(id).status))+'<br><span class="pf-small">'+safe(kb.gaps.get(id).reason)+'</span>').join("<br>");
 const stageMatrix='<div class="doc-table-wrap" role="region" tabindex="0" aria-label="Outcome stages by context"><table data-pf-colgroup><caption>Benefit access pathway: what is measured in each context</caption><thead><tr><th scope="col">Outcome stage</th>'+
  coverage.map(c=>'<th scope="col" data-pf-col="'+safe(c.id)+'">'+safe(kb.ctx.get(c.id).name)+'<br><span class="pf-small">'+safe(kb.progs.get(c.ad.programmeId).name)+'</span></th>').join("")+'</tr></thead><tbody>'+
  Object.keys(STAGE_TITLE).map((stage,i)=>'<tr><th scope="row">'+safe(STAGE_TITLE[stage])+'<br><span class="pf-small">'+safe(p.solutions.outcomeStages[i].guard)+'</span></th>'+coverage.map(c=>'<td data-pf-col="'+safe(c.id)+'">'+cell(c.rows[i])+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
 const newham=["F-NEWHAM-PC-ELIGIBLE-2023-24","F-NEWHAM-PC-RECEIVING-2023-24","F-NEWHAM-PC-NOT-RECEIVING-2023-24"].map(id=>kb.facts.get(id));
 const funnel='<figure class="pf-card"><figcaption><strong>Newham, DWP 2023/24 local model (one source, one population, one period)</strong></figcaption>'+
  newham.map(f=>'<div class="pf-meter"><label for="m-'+safe(f.id.toLowerCase())+'">'+safe(f.label)+'</label><meter id="m-'+safe(f.id.toLowerCase())+'" min="0" max="'+newham[0].value+'" value="'+f.value+'">'+safe(formatValue(f))+'</meter><span>'+safe(formatValue(f))+'</span></div>').join("")+
  '<p class="pf-small">Only these three figures share a source, unit and period, so only they are drawn together. Recife and Naples have no comparable local series, so no bars are drawn for them.</p></figure>';
 const rateRows=rateComparabilityMatrix(kb).map(x=>tr([a(routeFor("fact",x.factA),kb.facts.get(x.factA).label),a(routeFor("fact",x.factB),kb.facts.get(x.factB).label),
  x.comparable?badge("evidence","Directly comparable"):badge("gap","Not directly comparable"),x.reasons.map(r=>"<strong>"+safe(r.dimension)+":</strong> "+safe(String(r.a))+" vs "+safe(String(r.b))).join("<br>")]));
 const options=facts.map(f=>'<option value="'+safe(f.id)+'">'+safe(kb.ctx.get(f.contextId).name+" — "+f.label)+'</option>').join("");
 await page("/intelligence/compare",{
  title:"Compare contexts",description:"Compare Newham, Recife and Naples by outcome stage and check whether two published figures can be compared — with explicit reasons when they cannot.",
  breadcrumb:crumbs(I_CRUMB,"Compare"),script:"/platform-compare.js",
  body:'<div class="index-content"><p class="status-note"><strong>No ranking.</strong> HPI does not score or rank contexts. Programmes, populations, units and periods differ; differences are shown, not averaged away.</p>'+
  '<h2>Recurring pathway, different rules</h2><p>All three contexts share a sequence from potential eligibility to receipt, which lets the same evaluation method be adapted. They do <strong>not</strong> share eligibility rules, institutions or data. Choose which contexts to display:</p>'+
  '<fieldset class="pf-col-toggle"><legend>Contexts shown</legend>'+coverage.map(c=>'<label><input type="checkbox" checked data-pf-toggle="'+safe(c.id)+'"> '+safe(kb.ctx.get(c.id).name)+'</label>').join("")+'</fieldset>'+
  stageMatrix+funnel+
  '<h2 id="pf-check">Check whether two figures are comparable</h2><form class="pf-form" id="pf-compare-form"><div class="pf-form-grid">'+
  '<div><label for="pf-fact-a">First figure</label><select id="pf-fact-a" name="a">'+options+'</select></div>'+
  '<div><label for="pf-fact-b">Second figure</label><select id="pf-fact-b" name="b">'+options+'</select></div>'+
  '<div><button type="submit">Check comparability</button></div></div></form>'+
  '<div id="pf-compare-result" class="pf-result" role="status" aria-live="polite" data-state="idle">Select two figures. The check uses <a href="/platform-comparability.json">precomputed verdicts</a> and needs JavaScript; every pair is also listed below.</div>'+
  '<h2>All rate comparisons</h2>'+table("",["Figure A","Figure B","Verdict","Differences"],rateRows,{label:"Pairwise comparability of published rates"})+
  '<p>Comparability rules: same measure definition, unit, population unit, geography level, method, reference period, currency and price basis. See <a href="/intelligence/methods#comparability">methods</a>.</p></div>'
 });

 // ---------- Evidence trail ----------
 const claimRowsAll=[...kb.claims.values()].map(c=>{const r=kb.catalog.get(c.evidenceId),f=kb.mechanisms.get(c.mechanisms[0])?.familyId||(c.problems[0]&&kb.problems.get(c.problems[0]).familyId)||"none";
  return tr([safe(c.id),safe(c.statement),directionBadge(c.direction),safe(humanize(c.endpointLevel)),
   c.mechanisms.map(m=>a(routeFor("mechanism",m),kb.mechanisms.get(m).title)).join("<br>")||"—",
   safe(r.geography+" · "+r.year),a(r.sourceUrl,"Source "+r.id)+'<br><span class="pf-small">'+safe(humanize(r.extractionDepth))+'; retraction '+safe(humanize(r.retraction))+'</span>'],
   ' data-pf-item'+dataAttrs({family:f,direction:c.direction,endpoint:c.endpointLevel,search:[c.id,c.statement,r.geography,c.evidenceId].join(" ")}))});
 await page("/intelligence/evidence",{
  title:"Evidence trail",description:"Every claim and figure with its source, endpoint level, study setting, extraction depth, retraction-check status and correction history.",
  breadcrumb:crumbs(I_CRUMB,"Evidence trail"),script:"/platform-explorer.js",
  body:'<div class="index-content"><p class="status-note"><strong>Abstract-level evidence.</strong> Claims restate findings from the HPI evidence ledger. None has full-text dual review or formal risk-of-bias assessment; retraction status has not been checked.</p>'+
  '<ul class="pf-toc"><li><a href="#claims">Evidence claims</a></li><li><a href="#figures">Published figures</a></li><li><a href="#corrections">Corrections</a></li></ul>'+
  '<h2 id="claims">Evidence claims ('+kb.claims.size+')</h2><div data-pf-explorer><form class="pf-controls" role="search" aria-label="Filter evidence claims" data-pf-controls>'+
  '<div><label for="ev-q">Search</label><input id="ev-q" type="search" maxlength="120" data-pf-filter="search" placeholder="Study, country or claim"></div>'+
  '<div><label for="ev-family">Problem family</label><select id="ev-family" data-pf-filter="family"><option value="all">All</option>'+[...kb.families.values()].map(f=>'<option value="'+safe(f.id)+'">'+safe(f.title)+'</option>').join("")+'<option value="none">Unassigned</option></select></div>'+
  '<div><label for="ev-direction">Direction</label><select id="ev-direction" data-pf-filter="direction"><option value="all">All</option>'+["supports","mixed","null","adverse","descriptive"].map(d=>'<option value="'+d+'">'+d+'</option>').join("")+'</select></div>'+
  '<div><label for="ev-endpoint">Endpoint level</label><select id="ev-endpoint" data-pf-filter="endpoint"><option value="all">All</option>'+p.claims.endpointLevels.map(e=>'<option value="'+safe(e)+'">'+safe(humanize(e))+'</option>').join("")+'</select></div>'+
  '</form><p data-pf-count role="status" aria-live="polite">'+kb.claims.size+' claims</p><p data-pf-empty class="status-note" hidden>No claims match these filters.</p>'+
  table("",["Claim","Finding as recorded","Direction","Endpoint","Mechanisms","Study setting","Source and checks"],claimRowsAll,{label:"Filterable evidence claims"})+'</div>'+
  '<h2 id="figures">Published figures ('+facts.length+')</h2>'+table("",["Figure","Context","Value","Period","Verification","Rights"],facts.map(f=>tr([a(routeFor("fact",f.id),f.label),a(routeFor("context",f.contextId),kb.ctx.get(f.contextId).name),safe(formatValue(f)),safe(f.referencePeriod.label),verificationBadge(f.verificationLevel),safe(humanize(f.redistributionStatus))])),{label:"Published figures with provenance"})+
  '<h2 id="corrections">Corrections and supersessions</h2>'+table("",["Date","Type","Description","Affected"],p.corrections.items.map(c=>tr([safe(c.date),safe(humanize(c.type)),safe(c.description),[...c.affectedEntityIds.map(id=>kb.facts.has(id)?a(routeFor("fact",id),id):safe(id)),...c.affectedDocuments.map(d=>a(d,d))].join("<br>")])),{label:"Correction history"})+
  '<p>Retraction checks: <strong>'+safe(humanize(p.corrections.retractionCheckStatus))+'</strong>. Report a correction through <a href="/adopt#contribute">the correction pathway</a>.</p></div>'
 });

 // ---------- Methods ----------
 const assessed=p.opportunity.candidates.map(c=>assessCandidate(c,p.opportunity));
 const sens=weightSensitivity(p.opportunity.candidates,p.opportunity);
 await page("/intelligence/methods",{
  title:"Methods, comparability and opportunity assessment",description:"Data contracts, comparability rules, transparent opportunity assessment with hard vetoes, the deterministic consistency audit and the ingestion workflow.",
  breadcrumb:crumbs(I_CRUMB,"Methods"),
  body:'<div class="index-content"><ul class="pf-toc"><li><a href="#contract">Data contract</a></li><li><a href="#comparability">Comparability</a></li><li><a href="#opportunity">Opportunity assessment</a></li><li><a href="#consistency">Consistency audit</a></li><li><a href="#ingestion">Expanding coverage</a></li></ul>'+
  '<h2 id="contract">Versioned data contract (schema 1.0)</h2><p>Every figure carries a stable identifier, source organisation and URL, publication and retrieval dates, reference period, geography, population definition, unit, measure definition, numerator and denominator where applicable, licence and redistribution status, transformation, verification level, uncertainty, missingness, limitations and review status. Any missing provenance field must be declared with a reason; the build fails otherwise.</p>'+
  list(["Source facts, HPI interpretations and hypotheses are stored separately and labelled.","Denominators are never synthesised; a rate may only be derived from counts sharing source, context, period and population unit.","Mechanisms labelled evidence-linked must have claims; candidate hypotheses must have none.","Null and adverse findings cannot be recorded as supportive.","Retracted evidence must be withdrawn from claims.","Aggregate prosperity scores and rankings are rejected by the validator.","Text fields may not contain markup; links must be first-party or HTTPS without credentials."].map(safe))+
  '<p>'+a("/platform-schema.json","Machine-readable contract (JSON)")+' · '+a("/library/docs/platform/knowledge-architecture-and-data-contracts-v1","Full documentation")+'</p>'+
  '<h2 id="comparability">Comparability rules</h2><p>Two figures are directly comparable only when they share measure definition, unit, population unit (households, persons, benefit units or expenditure), geography level, method (survey, administrative model, service report, index), reference period, currency and price basis. When any differs, HPI explains the difference instead of drawing a comparative chart. Poverty lines, PPP vintages, household definitions, age groups and programme rules must be stated before any comparison.</p>'+
  '<h2 id="opportunity">Opportunity assessment (decision support only)</h2><p>The F0-02.5 baseline rubric is preserved exactly: '+p.opportunity.baselineRubric.criteria.map(c=>safe(c.title+" "+c.weightPercent+"%")).join(", ")+'. A weighted score is computed only when every criterion has an independent or community score. Hard vetoes for fieldwork are evaluated separately and cannot be offset. Extended considerations are recorded qualitatively, never weighted.</p>'+
  table("",["Candidate","Desk research","Fieldwork","Criteria scored","Weighted score","Triggered vetoes"],assessed.map(x=>tr([safe(x.title),safe(x.deskResearchStatus),x.fieldDecision==="NO_GO"?badge("nogo","NO-GO"):badge("hypothesis","Human decision required"),safe(x.scoredCriteria+" of "+x.totalCriteria),x.weightedScore===null?badge("gap","Not scorable"):safe(String(x.weightedScore)),safe(x.triggeredVetoes.join(", ")||"none")])),{label:"Opportunity assessment status"})+
  '<p><strong>Sensitivity analysis:</strong> '+safe(sens.performed?"performed":"not performed — "+sens.reason)+' No ranking of candidates is published.</p>'+
  '<h3>Extended considerations (unweighted)</h3>'+table("",["Consideration","Evidence required"],p.opportunity.extendedConsiderations.map(x=>tr([safe(x.title),safe(x.evidenceRequirement)])),{label:"Extended considerations"})+
  '<h3>Hard vetoes for fieldwork</h3>'+list(p.opportunity.vetoes.map(v=>safe(v.title)))+
  '<p>'+a("/platform-opportunity-assessment.json","Assessment output (JSON)")+'</p>'+
  '<h2 id="consistency">Deterministic consistency audit ('+audit.length+' findings)</h2><p>Rule-based checks run at every build. <strong>They are not AI</strong> and do not judge study quality.</p>'+
  table("",["Type","Severity","Entity","Finding"],audit.map(x=>tr([safe(humanize(x.type)),safe(x.severity),safe(x.entityId),safe(x.message)+(x.relatedIds.length?'<br><span class="pf-small">'+safe(x.relatedIds.slice(0,12).join(", "))+'</span>':"")])),{label:"Consistency audit findings"})+
  '<p>'+a("/platform-consistency-audit.json","Audit output (JSON)")+'</p>'+
  '<h2 id="ingestion">Expanding coverage without rebuilding the platform</h2><ol class="project-steps"><li>Add or correct a record in <code>research/platform/*.json</code> by pull request, citing the source.</li><li>Declare any missing provenance with a reason; never estimate a missing value.</li><li>Run <code>npm run research:platform:verify</code> and <code>npm run check</code>; the build fails on any contract violation.</li><li>Append a correction entry when changing a published figure.</li></ol>'+
  '<p class="status-note"><strong>Source acquisition boundary:</strong> the RT-02.6 NO-GO on ingesting or redistributing third-party datasets remains in force. This knowledge base holds citations and transcribed figures with provenance, not imported datasets. Automated source adapters are not built until licences, comparability and user need are verified.</p></div>'
 });

 // ---------- AI assistance status ----------
 const cfg=aiStatus.configuration;
 await page("/intelligence/ai-assistance",{
  title:"AI research assistance: status and safeguards",description:"Whether an inference provider is connected, what the AI layer can and cannot do, its safeguards and how to activate it locally.",
  breadcrumb:crumbs(I_CRUMB,"AI assistance"),
  body:'<div class="index-content"><div class="'+(aiStatus.productionInference?"status-note":"pf-nogo-banner")+'"><strong>Inference provider: '+safe(aiStatus.productionInference?"connected":"not connected")+'.</strong> '+safe(aiStatus.statement)+'</div>'+
  '<dl class="pf-dl"><dt>Provider</dt><dd>'+safe(cfg.provider)+'</dd><dt>Reason</dt><dd>'+safe(cfg.reasonDisabled||"Configured")+'</dd><dt>AI-generated content published</dt><dd>'+safe(String(aiStatus.publishedAiGeneratedContent))+'</dd><dt>Request ceiling per run</dt><dd>'+safe(String(cfg.limits.maxRequests))+' requests, '+safe(String(cfg.limits.maxInputChars))+' input characters</dd></dl>'+
  '<h2>What is implemented and tested</h2>'+list(["A provider adapter for OpenAI-compatible chat endpoints (local runtimes such as Ollama, LM Studio, llama.cpp server or LiteLLM). It is tested against simulated transports, not a live model.","Claim extraction and source classification prompts, versioned and fingerprinted.","Validation of model output against a strict schema, the cited source and the knowledge-base vocabularies.","A human review queue written only to local, git-ignored files."].map(safe))+
  '<h2>Safeguards</h2>'+list(aiStatus.safeguards.map(safe))+
  '<h2>Never permitted</h2>'+list(aiStatus.prohibitedUses.map(safe))+
  '<h2>Prompt versions</h2>'+table("",["Prompt","SHA-256"],aiStatus.promptTemplates.map(t=>tr([safe(t.id),'<code>'+safe(t.sha256)+'</code>'])),{label:"Prompt fingerprints"})+
  '<h2>What runs today without AI</h2><p>The <a href="/intelligence/methods#consistency">deterministic consistency audit</a> flags conflicting evidence, intermediate-only endpoints, non-independent studies, older evidence and unverified provenance at every build. A rule-based source profiler is available with <code>npm run ai:baseline</code>.</p>'+
  '<h2>Activate locally (no paid API by default)</h2><pre class="doc-code">HPI_AI_PROVIDER=openai_compatible\nHPI_AI_BASE_URL=http://127.0.0.1:11434\nHPI_AI_MODEL=your-local-model\nnpm run ai:extract -- --ids E04,E12</pre><p>Remote hosts must be HTTPS and listed in <code>HPI_AI_ALLOWED_HOSTS</code>. Known paid providers are refused unless <code>HPI_AI_PAID_USE_APPROVAL_REF</code> points to a GitHub issue recording explicit cost approval. '+a("/library/docs/platform/ai-research-assistance-v1","Full AI architecture and safeguards")+' · '+a("/platform-ai-status.json","Status (JSON)")+'</p></div>'
 });

 // ---------- Data & reuse ----------
 await page("/intelligence/data",{
  title:"Data, exports and reproduction",description:"Download the knowledge base, figures, claims, graph edges and data contract, verify SHA-256 digests and reproduce the build.",
  breadcrumb:crumbs(I_CRUMB,"Data & reuse"),
  body:'<div class="index-content"><p class="status-note">HPI-authored structure and text: CC BY 4.0; code: MIT. Third-party figures are attributed citations and retain their owners’ rights — check each record’s redistribution status before reuse.</p>'+
  '<h2>Downloads</h2>'+table("",["File","Contents","SHA-256 prefix"],exportsInfo.files.map(f=>tr([a(f.path,f.path,{download:true}),safe(f.description),'<code>'+safe(f.sha256.slice(0,16))+'…</code>'])),{label:"Machine-readable exports"})+
  '<h2>Source digests</h2>'+table("",["Knowledge-base source file","SHA-256 prefix"],exportsInfo.sources.map(s=>tr([safe(s.path),'<code>'+safe(s.sha256.slice(0,16))+'…</code>'])),{label:"Source file digests"})+
  '<p>Full digests: '+a("/platform-manifest.json","platform manifest (JSON)")+'. Digests prove byte identity, not scientific validity.</p>'+
  '<h2>Reproduce</h2><pre class="doc-code">git clone https://github.com/svtmzt/human-prosperity-initiative.git\ncd human-prosperity-initiative\ngit checkout [commit from /publication.json]\nnpm run research:platform:verify\nnpm run build</pre>'+
  '<p>Exports are byte-deterministic for identical inputs. See the '+a("/research/reproducibility","existing reproducibility pipeline")+' for RT-01 artifacts.</p></div>'
 });
 return routes;
}
