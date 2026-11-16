/**
 * Pillar 2 — Solutions & Experimentation Engine, and Pillar 3 — Global Adoption
 * Network. Evaluation designs and reusable resources, never delivered services,
 * recommendations, partnerships or adoption claims.
 */
import {a,badge,crumbs,directionBadge,formatValue,humanize,list,routeFor,safe,table,tr,SOLUTION_ROUTES} from "./platform-html.mjs";
import {stageCoverage} from "../research-tools/prosperity-platform.mjs";

const STAGE_TITLE={potentially_eligible:"Potentially eligible",applied:"Applied",approved:"Approved",received:"Benefit received",sustained_improvement:"Sustained economic improvement"};
const maturityMeter=(s,levels)=>{const l=levels.find(x=>x.level===s.maturity.level);
 return '<div class="pf-meter"><label for="mat-'+safe(s.id.toLowerCase())+'">Maturity</label><meter id="mat-'+safe(s.id.toLowerCase())+'" min="0" max="7" value="'+s.maturity.level+'">'+s.maturity.level+' of 7</meter><span>Level '+s.maturity.level+' of 7 · '+safe(l.title)+'</span></div>'};

export async function publishSolutionsAndAdoption({publish,shell,kb,funnel,downloads,governanceGates}){
 const routes=[];
 const page=async(route,opts)=>{routes.push(route);await publish(route,shell({route,stylesheet:"/platform.css",...opts}))};
 const p=kb.parsed,levels=p.adoption.maturityLevels;
 const sols=[...kb.solutions.values()];
 const sequence=[["Problem","Defined from published research","done"],["Mechanism","Recurring causal pathway identified","done"],["Existing evidence","Abstract-level internal synthesis","done"],
  ["Intervention hypothesis","Linked to evidence, not tested by HPI","done"],["Evaluation design","Reusable package and protocol template","prototype"],["Local adaptation","Context records with declared gaps","prototype"],
  ["Independent validation","Requires external reviewers and approvals","blocked"],["Potential adoption","Requires an accountable institution","blocked"],["Measured outcomes","Requires an approved study","blocked"]];
 const seqBadge={done:badge("evidence","Desk work done"),prototype:badge("hypothesis","Prototype"),blocked:badge("gap","Blocked: human approvals")};
 const seqHtml='<ol class="pf-chain">'+sequence.map(([t,d,s],i)=>'<li><span>'+(i+1)+'</span><div><strong>'+safe(t)+'</strong> '+seqBadge[s]+'<small>'+safe(d)+'</small></div></li>').join("")+'</ol>';

 await page("/solutions",{
  title:"Solutions & Experimentation Engine",section:"Solutions & Experimentation Engine",
  description:"Reusable, scientifically testable intervention and evaluation designs linked to problems, mechanisms and evidence. Research designs, not recommendations or delivered services.",
  breadcrumb:crumbs("Solutions"),
  body:'<div class="index-content"><section class="editorial-intro"><span class="eyebrow-dark">PILLAR 2 · EVALUATION DESIGNS</span><h2>From mechanism to a testable design.</h2>'+
  '<p>Each package specifies the problem, mechanism, evidence and limits, the outcome to measure, the comparison required, the harms to watch, local adaptation needs and the approvals still missing. None has been implemented or evaluated by HPI.</p></section>'+
  '<h2>Operating sequence</h2>'+seqHtml+
  '<h2>Solution packages</h2><div class="pf-pillars">'+sols.map(s=>'<article class="pf-pillar"><span class="pf-kicker">'+safe(kb.families.get(s.familyId).title)+'</span><h3><a href="'+safe(SOLUTION_ROUTES[s.id])+'">'+safe(s.title)+'</a></h3><p>'+safe(s.description)+'</p>'+maturityMeter(s,levels)+'<p class="pf-foot">Next level blocked by: '+safe(s.maturity.blockedNextLevel.missing.join("; "))+'</p></article>').join("")+'</div>'+
  '<h2>Connected research tools</h2><p>The Solutions Engine reuses the existing tools rather than duplicating them:</p><ul>'+
  '<li>'+a("/research/source-catalog","Source Catalogue")+' — every evidence claim resolves to a catalogue record with rights and retraction status.</li>'+
  '<li>'+a("/research/outcome-lab","Synthetic Outcome Lab")+' — explore receipt-rate comparisons and uncertainty on fictional counts.</li>'+
  '<li>'+a("/research/reproducibility","Reproducibility Pipeline")+' — RT-01 artifacts; platform exports add their own '+a("/platform-manifest.json","digest manifest")+'.</li>'+
  '<li>'+a("/research/responsible-tools","Responsible Tools")+' — privacy, licensing and the eight pending governance gates.</li></ul>'+
  '<h2>Maturity model</h2><p>Levels are awarded only with recorded evidence; the build rejects unsupported levels.</p>'+
  table("",["Level","Stage","Definition","Evidence required"],levels.map(l=>tr([safe(String(l.level)),safe(l.title),safe(l.definition),safe(l.evidenceRequired)])),{label:"Solution maturity model"})+'</div>'
 });

 // ---------- Benefit access vertical slice ----------
 const s=kb.solutions.get("SOL-BENEFIT-ACCESS-EVALUATION");
 const mp=s.measurementPlan;
 const gateRows=s.ethicalLegalGates.map(id=>{const g=governanceGates.find(x=>x.id===id)||{id,topic:"unknown",authority:"unknown",state:"unknown"};
  return tr([safe(g.id),safe(humanize(g.topic)),safe(humanize(g.authority)),badge("gap",humanize(g.state))])});
 const adaptation=s.localAdaptations.map(ad=>{
  const ctx=kb.ctx.get(ad.contextId),prog=kb.progs.get(ad.programmeId),cov=stageCoverage(kb,ad.contextId,ad.programmeId);
  return '<article class="pf-card"><h3>'+a(routeFor("context",ad.contextId),ctx.name)+'</h3><p class="pf-small">'+safe(prog.name)+' · '+safe(humanize(prog.accessModel))+' · '+safe(humanize(ctx.role))+'</p>'+
   '<table><caption class="pf-small">Outcome-stage coverage</caption><tbody>'+cov.map(r=>'<tr><th scope="row">'+safe(STAGE_TITLE[r.stage])+'</th><td>'+
    (r.localFacts.length?r.localFacts.map(id=>{const f=kb.facts.get(id);return a(routeFor("fact",id),formatValue(f)+" — "+f.label)}).join("<br>"):
     r.widerGeographyFacts.length?badge("gap","No local figure")+"<br>"+r.widerGeographyFacts.map(id=>{const f=kb.facts.get(id);return a(routeFor("fact",id),kb.ctx.get(f.contextId).name+" only: "+f.label)}).join("<br>"):badge("gap","Not measured"))+'</td></tr>').join("")+'</tbody></table>'+
   '<p><strong>Adaptation notes</strong></p>'+list(ad.adaptationNotes.map(safe))+'<p><strong>Transferability limits</strong></p>'+list(ad.transferabilityLimits.map(safe))+
   '<p class="pf-small">Language: '+safe(ad.language)+' · Gates: '+safe(ad.legalAndDataGates.join(", "))+'</p></article>';
 }).join("");
 const fRows=funnel.stages.map(st=>tr([safe(STAGE_TITLE[st.stage]),safe(st.reference.count+" / "+st.reference.denominator+" = "+st.reference.ratePct+"%"),safe(st.comparison.count+" / "+st.comparison.denominator+" = "+st.comparison.ratePct+"%"),
  safe((st.differencePp>0?"+":"")+st.differencePp+" pp"),safe("["+st.differenceInterval95Pp[0]+", "+st.differenceInterval95Pp[1]+"] pp"),st.intervalExcludesZero?badge("mixed","Excludes zero"):badge("neutral","Includes zero")]));
 await page("/solutions/benefit-access",{
  title:"Benefit access: verified-receipt evaluation package",section:"Solutions · worked vertical slice",
  description:"A reusable method for evaluating administrative-barrier interventions on verified benefit receipt, adapted to Newham, Recife and Naples with explicit gaps, synthetic demonstration and approval gates.",
  breadcrumb:crumbs('<a href="/solutions">Solutions</a>',"Benefit access"),script:"/solutions-planner.js",
  body:'<div class="index-content"><div class="pf-nogo-banner"><strong>Methodology prototype — not a service, not a recommendation, not authorised fieldwork.</strong> No one has been assessed, contacted or enrolled. Eligibility rules differ in each context; this package never determines anyone’s entitlement.</div>'+
  maturityMeter(s,levels)+
  '<ul class="pf-toc"><li><a href="#mechanism">Mechanism</a></li><li><a href="#stages">Outcome stages</a></li><li><a href="#contexts">Three contexts</a></li><li><a href="#evidence">Evidence</a></li><li><a href="#synthetic">Synthetic comparison</a></li><li><a href="#measurement">Measurement plan</a></li><li><a href="#planner">Sample-size planner</a></li><li><a href="#gates">Approval gates</a></li><li><a href="#downloads">Downloads</a></li></ul>'+
  '<h2 id="mechanism">1. A recurring mechanism</h2><p>'+safe(s.description)+'</p><p><strong>Rationale:</strong> '+safe(s.scientificRationale)+'</p>'+
  list(s.mechanisms.map(id=>a(routeFor("mechanism",id),kb.mechanisms.get(id).title)))+
  '<p>Candidate interventions (hypotheses): '+s.candidateInterventions.map(id=>a(routeFor("intervention",id),kb.interventions.get(id).title)).join(" · ")+'</p>'+
  '<h2 id="stages">2. Five outcome stages that must never be conflated</h2>'+table("",["Stage","Guard"],p.solutions.outcomeStages.map(x=>tr([safe(x.title),safe(x.guard)])),{label:"Outcome stages"})+
  '<p>An increase in applications is not an increase in income or prosperity. The primary outcome is <strong>verified receipt</strong>; sustained improvement requires a separate, credible follow-up.</p>'+
  '<h2 id="contexts">3. Local adaptation in three contexts</h2><p>The same method is adapted, not copied. Recife and Naples are contextual comparators with large measurement gaps; Newham is the only context with a source-verified local series.</p><div class="pf-split">'+adaptation+'</div>'+
  '<p>'+a("/intelligence/compare","Compare these contexts stage by stage")+'</p>'+
  '<h2 id="evidence">4. Existing evidence</h2>'+table("",["Claim","Finding as recorded","Direction","Endpoint","Source"],s.existingEvidenceClaims.map(id=>{const c=kb.claims.get(id),r=kb.catalog.get(c.evidenceId);
   return tr([safe(c.id),safe(c.statement),directionBadge(c.direction),safe(humanize(c.endpointLevel)),a(r.sourceUrl,r.id+" · "+r.geography+" "+r.year)])}),{label:"Evidence for the benefit-access package"})+
  '<p><strong>Limitations:</strong></p>'+list(s.evidenceLimitations.map(safe))+
  '<h2 id="synthetic">5. Synthetic comparison: applications versus receipt</h2><div class="pf-synthetic-banner">SYNTHETIC ONLY. '+safe(funnel.statement)+'</div>'+
  table("Fictional groups: usual services versus information outreach",["Stage","Usual services","Information outreach","Difference","95% interval","Interval"],fRows,{label:"Synthetic funnel comparison"})+
  '<p>'+safe(funnel.interpretation)+' Receipt missing-data bounds (worst/best case): usual services '+safe(funnel.receiptMissingDataBounds.usualServices.lowerPct+"–"+funnel.receiptMissingDataBounds.usualServices.upperPct)+'%, outreach '+safe(funnel.receiptMissingDataBounds.informationOutreach.lowerPct+"–"+funnel.receiptMissingDataBounds.informationOutreach.upperPct)+'%. '+safe(funnel.intervalMethod)+'. Causal interpretation: '+safe(funnel.causalInterpretation)+'.</p>'+
  '<p>Explore your own fictional counts in the '+a("/research/outcome-lab","Synthetic Outcome Lab")+'.</p>'+
  '<h2 id="measurement">6. Measurement plan</h2><dl class="pf-dl"><dt>Primary outcome</dt><dd>'+safe(mp.primaryOutcome.indicatorId)+' — '+safe(mp.primaryOutcome.definition)+'</dd>'+
  mp.secondaryOutcomes.map(o=>'<dt>Secondary '+safe(o.indicatorId)+'</dt><dd>'+safe(o.definition)+'</dd>').join("")+
  '<dt>Intermediate stages</dt><dd>'+safe(mp.intermediateStages.map(x=>STAGE_TITLE[x]).join(", "))+' — reported, never substituted for receipt</dd><dt>Harms</dt><dd>'+safe(mp.harmMeasures.join("; "))+'</dd>'+
  '<dt>Comparison</dt><dd>'+safe(mp.comparisonRequirement)+'</dd><dt>Missing data</dt><dd>'+safe(mp.missingData)+'</dd><dt>Causal inference</dt><dd>'+safe(mp.causalInference)+'</dd><dt>Sample size</dt><dd>'+safe(mp.sampleSize)+'</dd></dl>'+
  '<p>Indicators are F0-03 drafts with status <em>proposed, not validated</em>. '+a("/research/f0-03-indicator-catalog-v0-1","Indicator catalogue")+'</p>'+
  '<h3>Prerequisites</h3><div class="pf-split"><div class="pf-card"><h3>Resources</h3>'+list(s.resourcePrerequisites.map(safe))+'</div><div class="pf-card"><h3>Institutional</h3>'+list(s.institutionalPrerequisites.map(safe))+'</div><div class="pf-card"><h3>Potential harms</h3>'+list(s.potentialHarms.map(safe))+'</div></div>'+
  '<h2 id="planner">7. Sample-size planner (planning aid)</h2><p class="pf-warning">Illustrative inputs only. HPI has no verified baseline receipt rate for any study population; these defaults are not Newham, Recife or Naples figures.</p>'+
  '<form class="pf-form" id="pf-planner" novalidate><div class="pf-form-grid">'+
  [["pl-base","Baseline receipt rate (0–1)","0.10","0.001","0.999","0.001"],["pl-comp","Comparison receipt rate (0–1)","0.15","0.001","0.999","0.001"],["pl-alpha","Two-sided alpha","0.05","0.001","0.2","0.001"],
   ["pl-power","Power","0.8","0.51","0.99","0.01"],["pl-attr","Expected attrition (0–0.9)","0.1","0","0.89","0.01"],["pl-icc","Intra-cluster correlation (0 if individual)","0","0","0.99","0.001"]].map(([id,l,v,min,max,step])=>
   '<div><label for="'+id+'">'+safe(l)+'</label><input id="'+id+'" type="number" inputmode="decimal" value="'+v+'" min="'+min+'" max="'+max+'" step="'+step+'" required></div>').join("")+
  '<div><label for="pl-cluster">Cluster size (1 if individual)</label><input id="pl-cluster" type="number" value="1" min="1" max="10000" step="1" required></div>'+
  '<div><button type="submit">Calculate planning estimate</button></div></div></form>'+
  '<div id="pf-planner-result" class="pf-result" role="status" aria-live="polite" data-state="idle">Requires JavaScript. Formula: two-proportion normal approximation with pooled null variance; see the '+a("/evaluation-design.js","source module")+'.</div>'+
  '<h2 id="gates">8. Scientific, ethical and legal gates</h2>'+table("",["Gate","Topic","Required authority","State"],gateRows,{label:"Approval gates"})+
  '<p>Related open GitHub issues: '+s.governanceIssues.map(n=>a("https://github.com/svtmzt/human-prosperity-initiative/issues/"+n,"#"+n)).join(" · ")+'</p>'+
  '<p><strong>Next maturity level blocked by:</strong></p>'+list(s.maturity.blockedNextLevel.missing.map(safe))+
  '<h2 id="downloads">9. Reusable artifacts</h2>'+list(downloads.map(d=>a(d.path,d.label,{download:true})+" — "+safe(d.description)))+
  '<p>Related research: '+s.relatedResearch.map(u=>a(u,u)).join(" · ")+'</p></div>'
 });
 for(const id of ["SOL-ENERGY-AFFORDABILITY-TEMPLATE","SOL-LIVELIHOODS-TEMPLATE"]){
  const t=kb.solutions.get(id);
  await page(SOLUTION_ROUTES[id],{
   title:t.title,section:"Solutions · research template",description:t.description,
   breadcrumb:crumbs('<a href="/solutions">Solutions</a>',safe(kb.families.get(t.familyId).title)),
   body:'<div class="index-content"><p class="status-note"><strong>Research template at maturity level '+t.maturity.level+'.</strong> No context has been selected and no intervention is recommended.</p>'+maturityMeter(t,levels)+
   '<p>'+safe(t.description)+'</p><p><strong>Rationale:</strong> '+safe(t.scientificRationale)+'</p>'+
   '<h2>Mechanisms</h2>'+list(t.mechanisms.map(m=>a(routeFor("mechanism",m),kb.mechanisms.get(m).title)))+
   '<h2>Candidate interventions (hypotheses)</h2>'+list(t.candidateInterventions.map(i=>a(routeFor("intervention",i),kb.interventions.get(i).title)))+
   '<h2>Evidence</h2>'+table("",["Claim","Finding as recorded","Direction","Source"],t.existingEvidenceClaims.map(cid=>{const c=kb.claims.get(cid),r=kb.catalog.get(c.evidenceId);return tr([safe(c.id),safe(c.statement),directionBadge(c.direction),a(r.sourceUrl,r.id)])}),{label:"Evidence for "+t.title})+
   list(t.evidenceLimitations.map(safe))+
   '<h2>Proposed outcomes</h2><dl class="pf-dl"><dt>Primary ('+safe(t.measurementPlan.primaryOutcome.indicatorId)+')</dt><dd>'+safe(t.measurementPlan.primaryOutcome.definition)+'</dd>'+t.measurementPlan.secondaryOutcomes.map(o=>'<dt>'+safe(o.indicatorId)+'</dt><dd>'+safe(o.definition)+'</dd>').join("")+'<dt>Harms</dt><dd>'+safe(t.measurementPlan.harmMeasures.join("; "))+'</dd></dl>'+
   '<h2>Potential harms</h2>'+list(t.potentialHarms.map(safe))+
   '<h2>Next level blocked by</h2>'+list(t.maturity.blockedNextLevel.missing.map(safe))+'</div>'
  });
 }

 // ---------- Adoption toolkit ----------
 const resRows=p.adoption.resources.map(r=>tr([a(r.url,r.title,{download:!r.url.endsWith(".js")}),safe(humanize(r.type)),safe(r.licence),safe("Level "+r.maturityLevel),safe(r.prerequisites)]));
 const dims=p.adoption.readinessDimensions;
 const options=p.adoption.readinessStatuses.map(s=>'<option value="'+safe(s)+'">'+safe(humanize(s))+'</option>').join("");
 await page("/adopt",{
  title:"Adopt and adapt HPI resources",section:"Global Adoption Network",
  description:"Reusable methods, templates, data and software with licences, maturity, prerequisites, an adaptation readiness self-check, and contribution and correction pathways.",
  breadcrumb:crumbs("Adopt"),script:"/adopt-readiness.js",
  body:'<div class="index-content"><section class="editorial-intro"><span class="eyebrow-dark">PILLAR 3 · OPEN REUSE</span><h2>Reuse the method, not a promise.</h2>'+
  '<p>Researchers and institutions can inspect, download and adapt HPI resources now. HPI does not operate local interventions and has no partners or adopters.</p>'+
  '<p class="status-note"><strong>Adoption register: '+p.adoption.adoptionRecords.length+' entries. Partnership register: '+p.adoption.partnerships.length+' entries.</strong> No organisation has adopted, endorsed or partnered with HPI. Entries require public evidence verified independently of HPI.</p></section>'+
  '<ul class="pf-toc"><li><a href="#catalogue">Resource catalogue</a></li><li><a href="#readiness">Readiness self-check</a></li><li><a href="#specialist">Specialist review</a></li><li><a href="#reuse">Licences and citation</a></li><li><a href="#contribute">Contribute or correct</a></li><li><a href="#access">Language and accessibility</a></li></ul>'+
  '<h2 id="catalogue">Resource catalogue</h2>'+table("",["Resource","Type","Licence","Maturity","Prerequisites"],resRows,{label:"Reusable resources"})+
  '<h2 id="readiness">Adaptation readiness self-check</h2><p>Work through nine dimensions before adapting any resource. <strong>Everything you enter stays in this browser tab</strong> — nothing is sent, stored or tracked. Download your plan when finished.</p>'+
  '<form class="pf-form" id="pf-readiness">'+dims.map(d=>'<fieldset><legend>'+safe(d.title)+'</legend>'+list(d.questions.map(safe))+
   '<div class="pf-form-grid"><div><label for="rd-'+safe(d.id.toLowerCase())+'">Status</label><select id="rd-'+safe(d.id.toLowerCase())+'" data-pf-readiness="'+safe(d.id)+'" data-pf-title="'+safe(d.title)+'" data-pf-review="'+safe(d.specialistReview)+'">'+options+'</select></div>'+
   '<div><label for="rv-'+safe(d.id.toLowerCase())+'">Evidence link or note (optional)</label><input id="rv-'+safe(d.id.toLowerCase())+'" type="text" maxlength="300" data-pf-evidence="'+safe(d.id)+'"></div>'+
   '<div><p class="pf-small">Specialist review: '+safe(d.specialistReview)+'</p></div></div></fieldset>').join("")+
  '<div class="pf-actions"><button type="submit">Summarise readiness</button><button type="button" class="secondary" id="pf-readiness-md" disabled>Download plan (Markdown)</button><button type="button" class="secondary" id="pf-readiness-json" disabled>Download plan (JSON)</button></div></form>'+
  '<div id="pf-readiness-result" class="pf-result" role="status" aria-live="polite" data-state="idle">Requires JavaScript. Without it, use the '+a("/downloads/adaptation-readiness-checklist.md","printable checklist",{download:true})+'.</div>'+
  '<h2 id="specialist">When specialist review is required</h2>'+table("",["Dimension","Specialist review"],dims.map(d=>tr([safe(d.title),safe(d.specialistReview)])),{label:"Specialist review requirements"})+
  '<p class="pf-warning">Fieldwork, recruitment, personal-data processing or outreach require every dimension to be met with evidence and the relevant review completed. HPI cannot authorise these on anyone’s behalf.</p>'+
  '<h2 id="reuse">Licences, attribution and citation</h2>'+list(["Code: MIT ("+"see the software licence"+").","Original HPI documentation and data structure: CC BY 4.0.","Third-party studies and statistics keep their owners’ rights; HPI links and cites them rather than republishing datasets."].map(safe))+
  '<p>'+a("/library/software-license","Software licence")+' · '+a("/library/documentation-license","Documentation licence")+' · '+a("/copyright","Copyright and licences")+'</p>'+
  '<p>Suggested citation: <em>Human Prosperity Initiative (2026). Global Prosperity Platform knowledge base, schema 1.0. https://github.com/svtmzt/human-prosperity-initiative (commit from /publication.json).</em></p>'+
  '<h2 id="contribute">Contribute, challenge or correct</h2><ol class="project-steps"><li><strong>Scientific challenge or correction:</strong> open a public '+a("https://github.com/svtmzt/human-prosperity-initiative/issues/new?template=correction-or-challenge.md","correction or challenge issue")+' with the affected record ID, a dated source and your reasoning.</li>'+
  '<li><strong>Propose a new context or source:</strong> use the '+a("https://github.com/svtmzt/human-prosperity-initiative/issues/new?template=context-adaptation-proposal.md","context or source proposal template")+'. Public aggregate sources only.</li>'+
  '<li><strong>Improve code or data:</strong> follow the '+a("/contribute","contribution guide")+' and run <code>npm run check</code> before opening a pull request.</li></ol>'+
  '<p class="pf-warning"><strong>No confidential intake exists.</strong> Do not post personal, welfare, health or case details anywhere on GitHub or this site. HPI has no staffed private reporting channel yet ('+a("https://github.com/svtmzt/human-prosperity-initiative/issues/26","issue #26")+').</p>'+
  '<h2 id="access">Language and accessibility</h2><p>English is the complete primary language. Italian is available for the '+a("/platform/it","platform summary")+' and '+a("/research/responsible-tools/it","responsible-tools guidance")+' only, and has not been independently reviewed. Adapted materials must be offered in the languages people use, with non-digital and accessible channels. Automated accessibility checks are not a substitute for testing with assistive-technology users.</p>'+
  '<h2>Institutional integration</h2><p>'+a("/library/docs/platform/adoption-and-replication-framework-v1","Adoption and replication framework")+' · '+a("/library/docs/platform/solutions-and-evaluation-methodology-v1","Solutions and evaluation methodology")+'</p></div>'
 });
 return routes;
}
