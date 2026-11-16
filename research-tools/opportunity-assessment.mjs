/**
 * Transparent opportunity assessment (decision support, not a decision).
 * Preserves the F0-02.5 six-criterion rubric; separates hard vetoes; refuses
 * to compute a weighted score unless every criterion has an independent or
 * community score; sensitivity analysis only when at least two candidates are
 * fully scored. Extended considerations are qualitative and never weighted.
 */
export function weightedScore(criterionScores,criteria,scale={min:0,max:5}){
 const byId=new Map(criterionScores.map(s=>[s.criterionId,s]));
 let total=0;
 for(const c of criteria){
  const s=byId.get(c.id);
  if(!s||s.score===null||s.score===undefined)return null;
  total+=((s.score-scale.min)/(scale.max-scale.min))*c.weightPercent;
 }
 return Math.round(total*100)/100;
}
export function assessCandidate(candidate,assessment){
 const criteria=assessment.baselineRubric.criteria,scale=assessment.baselineRubric.scale;
 const accepted=new Set(assessment.acceptedScorerTypes);
 const scored=candidate.criterionScores.filter(s=>s.score!==null&&accepted.has(s.scorerType));
 const unscored=criteria.filter(c=>!scored.some(s=>s.criterionId===c.id)).map(c=>c.id);
 const triggered=candidate.vetoStatus.filter(v=>v.triggered).map(v=>v.vetoId);
 const score=unscored.length?null:weightedScore(scored,criteria,scale);
 return {
  id:candidate.id,title:candidate.title,deskResearchStatus:candidate.deskResearchStatus,
  fieldDecision:triggered.length?"NO_GO":"REQUIRES_HUMAN_DECISION",
  triggeredVetoes:triggered,
  scoredCriteria:scored.length,totalCriteria:criteria.length,unscoredCriteria:unscored,
  weightedScore:score,
  scoreStatus:score===null?"not_scorable: "+unscored.length+" of "+criteria.length+" criteria lack an independent or community score":"computed_from_recorded_scores",
  extendedConsiderations:"recorded_qualitatively_not_weighted",
  note:triggered.length?"Hard vetoes apply to fieldwork and cannot be offset by any score.":"A computed score informs but never replaces an accountable human decision."
 };
}
/**
 * Weight-perturbation sensitivity: move each criterion's weight by ±step
 * points, rescale the others proportionally to keep a total of 100, and check
 * whether the order of fully scored candidates changes.
 */
export function weightSensitivity(candidates,assessment,{step=5}={}){
 const results=candidates.map(c=>assessCandidate(c,assessment)).filter(r=>r.weightedScore!==null);
 if(results.length<2)return {performed:false,reason:"Requires at least two fully and independently scored candidates; "+results.length+" available.",perturbations:[]};
 const criteria=assessment.baselineRubric.criteria;
 const scored=new Map(candidates.map(c=>[c.id,c]));
 const order=ws=>results.map(r=>({id:r.id,score:weightedScore(scored.get(r.id).criterionScores,ws,assessment.baselineRubric.scale)}))
  .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).map(x=>x.id);
 const baseOrder=order(criteria);
 const perturbations=[];
 for(const target of criteria)for(const delta of [-step,step]){
  const w=Math.min(100,Math.max(0,target.weightPercent+delta));
  const others=100-target.weightPercent,remaining=100-w;
  const ws=criteria.map(c=>c.id===target.id?{...c,weightPercent:w}:{...c,weightPercent:others?c.weightPercent*remaining/others:0});
  const o=order(ws);
  perturbations.push({criterionId:target.id,delta,order:o,orderChanged:o.join()!==baseOrder.join()});
 }
 return {performed:true,baseOrder,orderStable:perturbations.every(p=>!p.orderChanged),perturbations};
}
