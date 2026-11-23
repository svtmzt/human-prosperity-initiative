/**
 * Internal, source-label-only diagnostic, NOT an independently adjudicated
 * scientific benchmark or proof of accuracy. Never copies LLM prose.
 */
export function compareInternallyCuratedClaimLabels(items,reports){
 if(!Array.isArray(items)||!items.length||!Array.isArray(reports)||!reports.length)
  throw new Error("Nonempty internal reference items and model reports required");
 const ref=new Map();
 for(const item of items){
  if(item.task!=="claim-extraction"||!Array.isArray(item?.reference?.claims))
   throw new Error("Pilot diagnostics require versioned internal claim labels");
  ref.set(item.id,item.reference.claims.map(x=>[x.direction,x.endpointLevel].join("|")));
 }
 const summaries=reports.map(entry=>{
  const rows=new Map(entry.report.results.map(r=>[r.itemId,r]));
  let matched=0,missing=0,additional=0,reversedNullOrAdverse=0,duplicates=0;
  const perItem=[];
  for(const [id,expected] of ref){
   const row=rows.get(id);
   const counts=new Map();
   for(const c of row?.acceptedItems||[]){
    const k=[c.direction,c.endpointLevel].join("|");
    counts.set(k,(counts.get(k)||0)+1);
   }
   let itemMatched=0;
   for(const k of expected){
    const n=counts.get(k)||0;
    if(n>0){itemMatched++;counts.set(k,n-1)}
   }
   const itemExtra=[...counts.values()].reduce((a,b)=>a+b,0);
   const actual=row?.acceptedItems||[];
   for(const [i,c] of actual.entries()){
    if(actual.slice(0,i).some(x=>x.direction===c.direction&&x.endpointLevel===c.endpointLevel))
     duplicates++;
   }
   if(expected.some(k=>k.startsWith("null|")||k.startsWith("adverse|")) &&
      actual.some(c=>c.direction==="supports"))reversedNullOrAdverse++;
   matched+=itemMatched;
   missing+=expected.length-itemMatched;
   additional+=itemExtra;
   perItem.push({id,matchedLabels:itemMatched,expectedLabels:expected.length,
    additionalClaimsNeedingReview:itemExtra});
  }
  return {model:entry.model,expectedMatched:matched,expectedMissing:missing,
   additionalClaimsNeedingReview:additional,duplicateLabelPairs:duplicates,
   nullAdverseReversedToSupports:reversedNullOrAdverse,
   internalLabelsOnly:true,scientificAccuracyCertified:false,items:perItem};
 });
 return {kind:"hpi_private_internal_reference_diagnostic",
  source:"internally curated references, NOT independent expert gold",
  totalCases:items.length,independentScientificValidation:false,
  humanReviewRequired:true,notForScientificPublication:true,models:summaries};
}
