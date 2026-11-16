/* Economic Systems Lab interactive demonstrator. Uses the same published,
 * deterministic module as the static build. Synthetic inputs only; nothing
 * is sent or stored. All output is inserted with textContent. */
import {runScenario,validateParameters,PARAMETER_DEFAULTS} from "/systems-lab-model.js";

const form=document.getElementById("sl-form"),out=document.getElementById("sl-result");
const preset=document.getElementById("sl-preset"),reset=document.getElementById("sl-reset");
const inputs=[...document.querySelectorAll("[data-sl-param]")];
let data=null;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
const fmt=v=>new Intl.NumberFormat("en-GB",{maximumFractionDigits:0}).format(v);
function state(s,nodes){out.dataset.state=s;out.replaceChildren(...nodes)}
function fill(id){
 const s=data.scenarios.find(x=>x.id===id);
 for(const input of inputs){const k=input.dataset.slParam;input.value=String(s?.parameters?.[k]??PARAMETER_DEFAULTS[k])}
}
function render(run){
 const table=el("table");const cap=el("caption","Illustrative results — SYNTHETIC households, currency-neutral units per month");table.append(cap);
 const head=el("tr");for(const h of ["Synthetic household","Disposable income","Essential costs","Residual income","Status","Buffer months"])head.append(Object.assign(el("th",h),{scope:"col"}));
 const thead=el("thead");thead.append(head);table.append(thead);
 const body=el("tbody");
 for(const r of run.results){
  const row=el("tr");row.append(Object.assign(el("th",r.label),{scope:"row"}));
  row.append(el("td",fmt(r.disposableIncome)),el("td",fmt(r.essentialCosts)),el("td",fmt(r.residualIncome)));
  row.append(el("td",r.status==="deficit"?"Deficit":r.status==="fragile"?"Fragile":"Margin","pf-status-"+r.status));
  row.append(el("td",r.bufferMonths===null?"not depleting":r.bufferMonths));body.append(row);
 }
 table.append(body);
 const wrap=el("div",undefined,"doc-table-wrap");wrap.setAttribute("role","region");wrap.setAttribute("tabindex","0");wrap.setAttribute("aria-label","Interactive model results");wrap.append(table);
 state("ok",[el("p","Model "+run.modelId+" v"+run.modelVersion+": "+run.statusCounts.deficit+" deficit, "+run.statusCounts.fragile+" fragile, "+run.statusCounts.margin+" margin among the four synthetic types. Not a forecast; not population shares."),wrap]);
}
async function init(){
 if(!form||!out)return;
 try{
  const r=await fetch("/systems-lab-data.json",{headers:{accept:"application/json"}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  data=await r.json();
  if(!Array.isArray(data.archetypes)||!data.archetypes.every(a=>a.synthetic===true))throw new Error("Inputs are not explicitly synthetic");
 }catch(err){state("error",[el("p","Model inputs could not be loaded ("+err.message+"). Precomputed results below remain available.")]);return}
 preset.addEventListener("change",()=>{fill(preset.value);run()});
 reset.addEventListener("click",()=>{fill(preset.value);run()});
 form.addEventListener("submit",e=>{e.preventDefault();run()});
 fill(preset.value);run();
}
function run(){
 try{
  const params={};
  for(const input of inputs){const v=Number(input.value);if(!Number.isFinite(v)||input.value.trim()===""){throw new Error("Enter a number for "+input.labels[0].textContent)}params[input.dataset.slParam]=v}
  validateParameters(params,data.parameterBounds);
  render(runScenario(data.archetypes,params,data.parameterBounds));
 }catch(err){state("error",[el("p","Cannot run the model: "+err.message)])}
}
init();
