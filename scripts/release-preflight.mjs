/**
 * WEB-01 post-merge release preflight, NEVER a deployment or promotion tool.
 * It fails closed unless exact merged SHA checks and the candidate's publication
 * manifest agree. Promotion still requires an independently configured Vercel
 * Deployment Check or human-authorised staged-release operator.
 */
import {pathToFileURL} from "node:url";
import {REQUIRED_CHECKS,latestStatusStates,requiredStates} from "./ci-checks.mjs";
const SHA=/^[0-9a-f]{40}$/;
const DEFAULT_REPO="https://api.github.com/repos/svtmzt/human-prosperity-initiative";
const PROJECT_HOST=/^human-prosperity-initiative-[a-z0-9-]+-hub-ai-workflows\.vercel\.app$/;
const isTrustedGithubApi=url=>url.startsWith(DEFAULT_REPO+"/");
export const REQUIRED_CONTEXTS=REQUIRED_CHECKS;
export function validateCandidateUrl(raw){
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||
     (url.pathname!=="/"&&url.pathname!=="")||
     !(url.hostname==="human-prosperity-initiative.vercel.app"||
       PROJECT_HOST.test(url.hostname))))
    throw new Error("Candidate must be an HTTPS Vercel deployment origin");
  return url.origin;
}
export const currentCommitStatuses=latestStatusStates;
export async function inspectRelease({sha,candidateOrigin,fetchImpl=fetch,repo=DEFAULT_REPO,
  githubToken=process.env.GITHUB_TOKEN||""}){
  const summary={
    requestedSha:sha,verifiedSha:null,mainRevision:null,origin:null,
    statuses:{},manifestRevision:null,aiSafety:null,readyForHumanPromotion:false,
    reasons:[],scope:"preflight_only_no_promotion"
  };
  if(!SHA.test(String(sha))){summary.reasons.push("Invalid exact Git SHA");return summary}
  try{summary.origin=validateCandidateUrl(candidateOrigin)}
  catch{summary.reasons.push("Candidate origin is not a verified deployment hostname");return summary}
  const readJson=async url=>{
    const response=await fetchImpl(url,{method:"GET",redirect:"error",
      headers:{"Accept":"application/json","User-Agent":"HPI-Release-Preflight",
        ...(githubToken&&isTrustedGithubApi(url)?{Authorization:"Bearer "+githubToken}:{})},
      signal:AbortSignal.timeout(12000)});
    if(response.status!==200)throw Error("HTTP "+response.status);
    return response.json();
  };
  try{
    if(repo!==DEFAULT_REPO)throw Error("Unrecognised repository API origin");
    const main=await readJson(repo+"/branches/main");
    summary.mainRevision=main?.commit?.sha||null;
    if(summary.mainRevision!==sha)summary.reasons.push("Production candidate is not current main SHA");
    const result=await readJson(repo+"/commits/"+sha+"/status");
    if(result.sha!==sha)throw Error("Combined status SHA mismatch");
    summary.verifiedSha=result.sha;
    const runs=await readJson(repo+"/commits/"+sha+"/check-runs?per_page=100");
    const states=requiredStates({
      statuses:Array.isArray(result.statuses)?result.statuses:[],
      checkRuns:Array.isArray(runs.check_runs)?runs.check_runs:[]});
    for(const context of REQUIRED_CONTEXTS){
      const state=states[context];
      summary.statuses[context]=state;
      if(state!=="success")summary.reasons.push(context+": "+state);
    }
  }catch(e){summary.reasons.push("Cannot verify GitHub statuses: "+e.message)}
  try{
    const candidate=await readJson(summary.origin+"/publication.json");
    summary.manifestRevision=candidate.revision||null;
    if(candidate.revision!==sha)summary.reasons.push("Candidate manifest does not match merged SHA");
  }catch(e){summary.reasons.push("Cannot verify candidate publication: "+e.message)}
  try{
    const ai=await readJson(summary.origin+"/platform-ai-status.json");
    summary.aiSafety={
      productionInference:ai.productionInference,
      publicHostedInference:ai.publicHostedInference,
      publishedAiGeneratedContent:ai.publishedAiGeneratedContent};
    if(ai.productionInference!==false||ai.publicHostedInference!=="disabled"||
       ai.publishedAiGeneratedContent!==0)
      summary.reasons.push("Public AI inference or AI-generated claims are not confirmed disabled");
  }catch(e){summary.reasons.push("Cannot verify public AI disabled status: "+e.message)}
  summary.readyForHumanPromotion=summary.reasons.length===0;
  return summary;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [sha,origin]=process.argv.slice(2);
  const result=await inspectRelease({sha,candidateOrigin:origin});
  console.log(JSON.stringify(result,null,2));
  if(!result.readyForHumanPromotion)process.exitCode=1;
}
