/**
 * Evaluation planning aids for two-arm comparisons of a binary outcome such as
 * verified benefit receipt. Planning aid only: not a protocol, not a power
 * analysis approved by an independent methodologist. Browser-safe ES module.
 */
const A=[-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239];
const B=[-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1];
const C=[-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
const D=[7.784695709041462e-3,3.224671290700398e-1,2.445134137142996,3.754408661907416];
/** Inverse standard normal CDF (Acklam's rational approximation, |error| below 1.2e-9). */
export function normalQuantile(p){
 if(!(p>0&&p<1))throw new Error("Probability must be strictly between 0 and 1");
 const low=0.02425,high=1-low;
 if(p<low){const q=Math.sqrt(-2*Math.log(p));return (((((C[0]*q+C[1])*q+C[2])*q+C[3])*q+C[4])*q+C[5])/((((D[0]*q+D[1])*q+D[2])*q+D[3])*q+1)}
 if(p>high){const q=Math.sqrt(-2*Math.log(1-p));return -(((((C[0]*q+C[1])*q+C[2])*q+C[3])*q+C[4])*q+C[5])/((((D[0]*q+D[1])*q+D[2])*q+D[3])*q+1)}
 const q=p-0.5,r=q*q;
 return (((((A[0]*r+A[1])*r+A[2])*r+A[3])*r+A[4])*r+A[5])*q/(((((B[0]*r+B[1])*r+B[2])*r+B[3])*r+B[4])*r+1);
}
function proportion(v,name){if(typeof v!=="number"||!(v>0&&v<1))throw new Error(name+" must be a proportion strictly between 0 and 1");return v}
/**
 * Per-arm sample size for two independent proportions, equal allocation,
 * normal approximation with pooled variance under the null (no continuity correction).
 * Optional attrition inflation and cluster design effect (1 + (m − 1) × ICC).
 */
export function sampleSizeTwoProportions({baselineRate,comparisonRate,alpha=0.05,power=0.8,twoSided=true,attrition=0,clusterSize=1,icc=0}){
 const p1=proportion(baselineRate,"baselineRate"),p2=proportion(comparisonRate,"comparisonRate");
 if(p1===p2)throw new Error("Rates must differ; a zero difference has no finite sample size");
 if(!(alpha>0&&alpha<0.5))throw new Error("alpha must be between 0 and 0.5");
 if(!(power>0.5&&power<1))throw new Error("power must be between 0.5 and 1");
 if(!(attrition>=0&&attrition<0.9))throw new Error("attrition must be between 0 and 0.9");
 if(!(Number.isInteger(clusterSize)&&clusterSize>=1))throw new Error("clusterSize must be a positive integer");
 if(!(icc>=0&&icc<1))throw new Error("icc must be between 0 and 1");
 const za=normalQuantile(1-(twoSided?alpha/2:alpha)),zb=normalQuantile(power);
 const pbar=(p1+p2)/2;
 const raw=(za*Math.sqrt(2*pbar*(1-pbar))+zb*Math.sqrt(p1*(1-p1)+p2*(1-p2)))**2/(p1-p2)**2;
 const perArmAnalysed=Math.ceil(raw);
 const designEffect=1+(clusterSize-1)*icc;
 const perArmClustered=Math.ceil(perArmAnalysed*designEffect);
 const perArmRecruited=Math.ceil(perArmClustered/(1-attrition));
 return {method:"two-proportion normal approximation, pooled null variance, equal allocation",
  baselineRate:p1,comparisonRate:p2,differencePercentagePoints:Math.round((p2-p1)*10000)/100,
  alpha,power,twoSided,designEffect:Math.round(designEffect*1000)/1000,attrition,
  perArmAnalysed,perArmAfterDesignEffect:perArmClustered,perArmToRecruit:perArmRecruited,totalToRecruit:perArmRecruited*2,
  caveat:"Planning aid only. Requires a verified baseline rate, a justified minimum meaningful difference and independent methods review."};
}
