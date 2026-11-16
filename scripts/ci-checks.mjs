/**
 * Required release checks for HPI `main` and how to read them from public GitHub APIs.
 * GitHub Actions jobs report check runs (app `github-actions`); Vercel reports a
 * commit status. Both are normalised to success | pending | failure | missing.
 * Read-only: no credentials, no writes.
 */
export const ACTIONS_APP="github-actions";
export const ACTIONS_CHECKS=["website-quality","browser-accessibility"];
export const STATUS_CONTEXTS=["Vercel"];
export const REQUIRED_CHECKS=[...ACTIONS_CHECKS,...STATUS_CONTEXTS];

// GitHub combined-status API returns newest first. Do not let an older
// success overwrite the most recent pending/failure.
export function latestStatusStates(statuses){
 const seen=new Map();
 for(const item of statuses)if(!seen.has(item.context))seen.set(item.context,item.state);
 return seen;
}

export function checkRunState(run){
 if(run.status!=="completed")return "pending";
 if(run.conclusion==="success")return "success";
 if(run.conclusion==="neutral"||run.conclusion==="skipped")return "missing";
 return "failure";
}

// Only GitHub Actions runs count; for re-runs the newest (highest id) wins.
export function latestCheckRunStates(runs){
 const newest=new Map();
 for(const run of runs){
  if(run?.app?.slug!==ACTIONS_APP)continue;
  const prior=newest.get(run.name);
  if(!prior||Number(run.id)>Number(prior.id))newest.set(run.name,run);
 }
 return new Map([...newest].map(([name,run])=>[name,checkRunState(run)]));
}

export function requiredStates({statuses=[],checkRuns=[]}){
 const fromStatus=latestStatusStates(statuses);
 const fromChecks=latestCheckRunStates(checkRuns);
 const states={};
 for(const name of ACTIONS_CHECKS)states[name]=fromChecks.get(name)||"missing";
 for(const name of STATUS_CONTEXTS)states[name]=fromStatus.get(name)||"missing";
 return states;
}
