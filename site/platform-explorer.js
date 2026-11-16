/* Generic accessible filter for platform lists and tables.
 * Works on any [data-pf-explorer] container: controls carry data-pf-filter,
 * items carry data-pf-item plus data-pf-<key> attributes. Local only: no
 * network, storage or analytics. Without JavaScript every item stays visible. */
(()=>{
 for(const root of document.querySelectorAll("[data-pf-explorer]")){
  const controls=[...root.querySelectorAll("[data-pf-filter]")];
  const items=[...root.querySelectorAll("[data-pf-item]")];
  const count=root.querySelector("[data-pf-count]"),empty=root.querySelector("[data-pf-empty]");
  const form=root.querySelector("[data-pf-controls]");
  form?.addEventListener("submit",e=>e.preventDefault());
  const apply=()=>{
   let shown=0;
   for(const item of items){
    const ok=controls.every(c=>{
     const key=c.dataset.pfFilter,value=c.value.trim().toLocaleLowerCase().slice(0,120);
     if(!value||value==="all")return true;
     const data=(item.dataset["pf"+key[0].toUpperCase()+key.slice(1)]||"").toLocaleLowerCase();
     return key==="search"?data.includes(value):data===value;
    });
    item.hidden=!ok;if(ok)shown++;
   }
   if(count)count.textContent=shown+" of "+items.length+" shown";
   if(empty)empty.hidden=shown!==0;
  };
  for(const c of controls)c.addEventListener(c.tagName==="INPUT"?"input":"change",apply);
  apply();
 }
})();
