import test from "node:test";
import assert from "node:assert/strict";
import {REQUIRED_CHECKS,checkRunState,latestCheckRunStates,requiredStates} from "../scripts/ci-checks.mjs";

const run=(id,name,status,conclusion,slug="github-actions")=>({id,name,status,conclusion,app:{slug}});

test("required checks are the two GitHub Actions jobs plus Vercel",()=>{
 assert.deepEqual(REQUIRED_CHECKS,["website-quality","browser-accessibility","Vercel"]);
});
test("check-run states fail closed",()=>{
 assert.equal(checkRunState(run(1,"x","completed","success")),"success");
 assert.equal(checkRunState(run(1,"x","in_progress",null)),"pending");
 assert.equal(checkRunState(run(1,"x","queued",null)),"pending");
 for(const c of ["failure","cancelled","timed_out","action_required","stale"])
  assert.equal(checkRunState(run(1,"x","completed",c)),"failure");
 assert.equal(checkRunState(run(1,"x","completed","skipped")),"missing");
});
test("newest re-run wins and only GitHub Actions check runs count",()=>{
 const states=latestCheckRunStates([
  run(5,"website-quality","completed","failure"),
  run(9,"website-quality","completed","success"),
  run(20,"browser-accessibility","completed","success","impostor-app")
 ]);
 assert.equal(states.get("website-quality"),"success");
 assert.equal(states.has("browser-accessibility"),false);
});
test("a check-run named Vercel cannot stand in for the Vercel commit status",()=>{
 const states=requiredStates({statuses:[],checkRuns:[run(1,"Vercel","completed","success")]});
 assert.equal(states.Vercel,"missing");
 assert.equal(states["website-quality"],"missing");
});
