/* Sample-size planning aid for the benefit-access package. Local calculation
 * with the published module; illustrative inputs only. */
import {sampleSizeTwoProportions} from "/evaluation-design.js";

const form=document.getElementById("pf-planner"),out=document.getElementById("pf-planner-result");
const num=id=>Number(document.getElementById(id).value);
const p=t=>{const n=document.createElement("p");n.textContent=t;return n};
form?.addEventListener("submit",e=>{
 e.preventDefault();
 try{
  const r=sampleSizeTwoProportions({baselineRate:num("pl-base"),comparisonRate:num("pl-comp"),alpha:num("pl-alpha"),power:num("pl-power"),
   attrition:num("pl-attr"),clusterSize:num("pl-cluster"),icc:num("pl-icc")});
  out.dataset.state="ok";
  out.replaceChildren(p("Planning estimate: "+r.perArmAnalysed+" analysed per arm; "+r.perArmAfterDesignEffect+" after design effect "+r.designEffect+"; recruit "+r.perArmToRecruit+" per arm ("+r.totalToRecruit+" total) allowing "+Math.round(r.attrition*100)+"% attrition."),
   p("Difference: "+r.differencePercentagePoints+" percentage points, alpha "+r.alpha+" two-sided, power "+r.power+". "+r.caveat));
 }catch(err){out.dataset.state="error";out.replaceChildren(p("Cannot calculate: "+err.message))}
});
