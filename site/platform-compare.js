/* Context comparison: column toggles and a comparability check that reads
 * precomputed, same-origin verdicts. Loading, failure and empty states are
 * explicit; results are inserted with textContent only. */
(()=>{
 for(const box of document.querySelectorAll("[data-pf-toggle]")){
  box.addEventListener("change",()=>{
   for(const cell of document.querySelectorAll('[data-pf-col="'+CSS.escape(box.dataset.pfToggle)+'"]'))cell.hidden=!box.checked;
  });
 }
 const form=document.getElementById("pf-compare-form"),out=document.getElementById("pf-compare-result");
 if(!form||!out)return;
 const a=document.getElementById("pf-fact-a"),b=document.getElementById("pf-fact-b");
 if(b&&b.options.length>1)b.selectedIndex=1;
 let verdicts=null;
 const say=(state,lines)=>{out.dataset.state=state;out.replaceChildren(...lines.map(([tag,text])=>{const n=document.createElement(tag);n.textContent=text;return n}))};
 async function load(){
  if(verdicts)return verdicts;
  say("loading",[["p","Loading comparability verdicts…"]]);
  const r=await fetch("/platform-comparability.json",{headers:{accept:"application/json"}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  const data=await r.json();
  if(data?.kind!=="hpi_platform_comparability"||!Array.isArray(data.pairs))throw new Error("Unexpected format");
  verdicts=new Map(data.pairs.map(p=>[p.factA+"|"+p.factB,p]));return verdicts;
 }
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(a.value===b.value){say("error",[["p","Choose two different figures."]]);return}
  try{
   const map=await load();
   const v=map.get(a.value+"|"+b.value)||map.get(b.value+"|"+a.value);
   if(!v){say("error",[["p","No verdict found for this pair."]]);return}
   const lines=[["p",v.comparable?"Directly comparable: same definition, unit, population, geography, method, period and price basis.":"Not directly comparable. Do not chart or rank these figures together."]];
   for(const r of v.reasons)lines.push(["p",r.dimension+": "+String(r.a)+" vs "+String(r.b)+". "+r.explanation]);
   say(v.comparable?"ok":"warning",lines);
  }catch(err){say("error",[["p","Comparability verdicts could not be loaded ("+err.message+"). The full table of rate comparisons below remains available."]])}
 });
})();
