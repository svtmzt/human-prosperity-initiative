import test from "node:test";
import assert from "node:assert/strict";
import {inspectRelease,validateCandidateUrl,currentCommitStatuses} from "../scripts/release-preflight.mjs";
const SHA="a".repeat(40);
const ORIGIN="https://human-prosperity-initiative-abc-hub-ai-workflows.vercel.app";
const success=[
 {name:"website-quality",state:"success"},
 {name:"browser-accessibility",state:"success"},
 {name:"Vercel",state:"success"}
];
const asRun=(x,i)=>({id:i+1,name:x.name,app:{slug:"github-actions"},
 status:x.state==="pending"?"queued":"completed",conclusion:x.state==="pending"?null:x.state});
const safeAi={productionInference:false,publicHostedInference:"disabled",publishedAiGeneratedContent:0};
const mock=(checks=success,revision=SHA,observedSha=SHA,mainSha=SHA,ai=safeAi)=>async url=>({
 status:200,json:async()=>url.includes("/publication.json")?{revision}:
  url.includes("/platform-ai-status.json")?ai:
  url.includes("/branches/main")?{commit:{sha:mainSha}}:
  url.includes("/check-runs")?{check_runs:checks.filter(x=>x.name!=="Vercel").map(asRun)}:
  {sha:observedSha,statuses:checks.filter(x=>x.name==="Vercel").map(x=>({context:x.name,state:x.state}))}
});
test("WEB-01 preview release preflight requires exact verified merged SHA and candidate manifest",async()=>{
 const report=await inspectRelease({sha:SHA,candidateOrigin:ORIGIN,fetchImpl:mock()});
 assert.equal(report.readyForHumanPromotion,true);
 assert.equal(report.scope,"preflight_only_no_promotion");
 assert.equal(report.manifestRevision,SHA);
 assert.equal(report.mainRevision,SHA);
 assert.deepEqual(report.aiSafety,safeAi);
 assert.deepEqual(Object.values(report.statuses),["success","success","success"]);
});
test("WEB-01 release preflight never accepts missing, pending or failed post-merge CI",async()=>{
 for(const statuses of [
  success.slice(0,2),
  success.slice(1),
  success.map(x=>x.name==="website-quality"?{...x,state:"failure"}:x),
  success.map(x=>x.name==="browser-accessibility"?{...x,state:"pending"}:x),
  success.map(x=>x.name==="Vercel"?{...x,state:"failure"}:x)
 ]){
  const result=await inspectRelease({sha:SHA,candidateOrigin:ORIGIN,fetchImpl:mock(statuses)});
  assert.equal(result.readyForHumanPromotion,false);
  assert.ok(result.reasons.length);
 }
});
test("WEB-01 release preflight rejects older success when newest context is pending",()=>{
 const states=currentCommitStatuses([
  {context:"Vercel",state:"pending"},{context:"Vercel",state:"success"}]);
 assert.equal(states.get("Vercel"),"pending");
});
test("WEB-01 release preflight rejects mismatched SHA and forged deployment hosts",async()=>{
 assert.throws(()=>validateCandidateUrl("http://human-prosperity-initiative.vercel.app"));
 assert.throws(()=>validateCandidateUrl("https://human-prosperity-initiative.vercel.app.attacker.test"));
 assert.throws(()=>validateCandidateUrl("https://bad-user:pw@human-prosperity-initiative.vercel.app"));
 assert.throws(()=>validateCandidateUrl("https://unrelated-project.vercel.app"));
 assert.throws(()=>validateCandidateUrl("https://human-prosperity-initiative-attacker.vercel.app"));
 assert.throws(()=>validateCandidateUrl("https://human-prosperity-initiative.vercel.app/malicious"));
 assert.equal((await inspectRelease({sha:"invalid",candidateOrigin:ORIGIN,fetchImpl:mock()})).readyForHumanPromotion,false);
 assert.equal((await inspectRelease({sha:SHA,candidateOrigin:ORIGIN,fetchImpl:mock(success,SHA,"b".repeat(40))})).readyForHumanPromotion,false);
 assert.equal((await inspectRelease({sha:SHA,candidateOrigin:ORIGIN,fetchImpl:mock(success,"b".repeat(40))})).readyForHumanPromotion,false);
 assert.equal((await inspectRelease({sha:SHA,candidateOrigin:ORIGIN,fetchImpl:mock(success,SHA,SHA,"b".repeat(40))})).readyForHumanPromotion,false);
 for(const ai of [
  {...safeAi,productionInference:true},
  {...safeAi,publicHostedInference:"enabled"},
  {...safeAi,publishedAiGeneratedContent:1}
 ]){
  const r=await inspectRelease({sha:SHA,candidateOrigin:ORIGIN,fetchImpl:mock(success,SHA,SHA,SHA,ai)});
  assert.equal(r.readyForHumanPromotion,false);
  assert.ok(r.reasons.some(x=>x.includes("Public AI inference")));
 }
});
test("WEB-01 release preflight fails closed when remote site or GitHub status unavailable",async()=>{
 const result=await inspectRelease({sha:SHA,candidateOrigin:ORIGIN,fetchImpl:async()=>{throw Error("offline")}});
 assert.equal(result.readyForHumanPromotion,false);
 assert.equal(result.reasons.length,3);
});

test("QA.3 ephemeral GitHub token remains restricted to canonical REST and never reaches Vercel",async()=>{
 const requests=[];
 const base=mock();
 const fetched=async(url,options)=>{
  requests.push({url,authorization:options?.headers?.Authorization??null});
  return base(url,options);
 };
 const report=await inspectRelease({sha:SHA,candidateOrigin:ORIGIN,fetchImpl:fetched,githubToken:"fixture-read-only-token"});
 assert.equal(report.readyForHumanPromotion,true);
 assert.equal(requests.filter(x=>x.url.startsWith("https://api.github.com/")).length,3);
 assert.ok(requests.filter(x=>x.url.startsWith("https://api.github.com/")).every(x=>x.authorization==="Bearer fixture-read-only-token"));
 assert.ok(requests.filter(x=>x.url.startsWith(ORIGIN)).every(x=>x.authorization===null));
 assert.ok(!JSON.stringify(report).includes("fixture-read-only-token"),"Credential never enters release report");
});
test("QA.3 never sends a token to a user-supplied alternate repository",async()=>{
 const report=await inspectRelease({sha:SHA,candidateOrigin:ORIGIN,repo:"https://api.github.com/repos/other/repo",
  githubToken:"private-test-token",fetchImpl:async()=>{throw Error("Unexpected external request")}});
 assert.equal(report.readyForHumanPromotion,false);
 assert.ok(report.reasons.some(x=>x.includes("Unrecognised repository")));
});
