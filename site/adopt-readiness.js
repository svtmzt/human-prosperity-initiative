/* Adaptation readiness self-check. Everything stays in the browser: no
 * network requests, storage, cookies or analytics. User text is only placed
 * into textContent and into the locally generated download. */
(()=>{
 const form=document.getElementById("pf-readiness"),out=document.getElementById("pf-readiness-result");
 const mdBtn=document.getElementById("pf-readiness-md"),jsonBtn=document.getElementById("pf-readiness-json");
 if(!form||!out)return;
 let plan=null;
 const p=(t,cls)=>{const n=document.createElement("p");n.textContent=t;if(cls)n.className=cls;return n};
 const clean=s=>String(s).replace(/[\x00-\x1f\x7f]/g," ").trim().slice(0,300);
 function collect(){
  const dims=[...form.querySelectorAll("[data-pf-readiness]")].map(sel=>{
   const id=sel.dataset.pfReadiness,ev=form.querySelector('[data-pf-evidence="'+CSS.escape(id)+'"]');
   return {id,title:sel.dataset.pfTitle,status:sel.value,evidence:clean(ev?.value||""),specialistReview:sel.dataset.pfReview};
  });
  const met=dims.filter(d=>d.status==="met_with_evidence"&&d.evidence).length;
  const unsupported=dims.filter(d=>d.status==="met_with_evidence"&&!d.evidence).map(d=>d.title);
  const blocking=dims.filter(d=>!["met_with_evidence","not_applicable"].includes(d.status)||d.status==="met_with_evidence"&&!d.evidence);
  return {schemaVersion:"1.0",kind:"hpi_adaptation_readiness_self_check",generatedLocally:true,
   statement:"Self-assessment only. Not an HPI approval, endorsement or partnership. Fieldwork requires every dimension met with evidence and specialist review.",
   dimensions:dims,metWithEvidence:met,total:dims.length,unsupportedClaims:unsupported,
   fieldworkReady:blocking.length===0&&unsupported.length===0,nextSteps:blocking.map(d=>d.title+": obtain "+d.specialistReview)};
 }
 function download(name,type,text){
  const url=URL.createObjectURL(new Blob([text],{type}));
  const link=document.createElement("a");link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const markdown=x=>["# Adaptation readiness plan (self-assessment)","",x.statement,"","| Dimension | Status | Evidence | Specialist review |","|---|---|---|---|",
  ...x.dimensions.map(d=>"| "+[d.title,d.status.replaceAll("_"," "),d.evidence||"—",d.specialistReview].map(v=>v.replaceAll("|","/")).join(" | ")+" |"),"",
  "Met with evidence: "+x.metWithEvidence+" of "+x.total,"","## Next steps","",...(x.nextSteps.length?x.nextSteps.map(s=>"- "+s):["- No blocking dimensions recorded; independent review still required before any fieldwork."]),""].join("\n");
 form.addEventListener("submit",e=>{
  e.preventDefault();plan=collect();
  const lines=[p(plan.metWithEvidence+" of "+plan.total+" dimensions met with evidence.")];
  if(plan.unsupportedClaims.length)lines.push(p("Marked as met without evidence (treated as not met): "+plan.unsupportedClaims.join(", ")+"."));
  lines.push(p(plan.fieldworkReady?"No blocking dimension recorded. This is still a self-assessment: independent ethics, legal and methods review must confirm it before any fieldwork.":"Not ready for fieldwork: "+plan.nextSteps.length+" dimension(s) need evidence or specialist review."));
  lines.push(p("Self-assessment only — not an HPI approval, endorsement or partnership.","pf-small"));
  out.dataset.state=plan.fieldworkReady?"ok":"warning";out.replaceChildren(...lines);
  mdBtn.disabled=false;jsonBtn.disabled=false;
 });
 mdBtn?.addEventListener("click",()=>plan&&download("hpi-readiness-plan.md","text/markdown;charset=utf-8",markdown(plan)));
 jsonBtn?.addEventListener("click",()=>plan&&download("hpi-readiness-plan.json","application/json",JSON.stringify(plan,null,2)+"\n"));
})();
