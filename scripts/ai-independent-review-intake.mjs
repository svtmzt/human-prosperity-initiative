/**
 * HPI-AI.6-T07 — human independent-review intake tool.
 * Practice packets from internal examples are NOT scientific held-out data.
 * Never posts data to any cloud provider; only private local files.
 */
import {readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {join} from "node:path";
import {auditIndependentIntake,buildBlindPracticePack} from
 "../research-tools/ai-assist/independent-review-intake.mjs";

const root="qa-artifacts/ai-independent-review";
const intake=join(root,"private-intake.json");
const practice=join(root,"blind-practice-only.json");
const action=process.argv[2]??"status";
const ensurePrivate=async()=>{
 await mkdir(root,{recursive:true,mode:0o700});
 const meta=await stat(root);
 if((meta.mode&0o077)!==0)throw new Error("Private review directory has insufficiently restrictive permissions");
};
const writeOnce=async(name,object)=>{
 await writeFile(name,JSON.stringify(object,null,2)+"\n",{flag:"wx",mode:0o600});
};
if(action==="init"){
 await ensurePrivate();
 await writeOnce(intake,{schema:"hpi_ai6_independent_review_intake_v1",
  classification:"PRIVATE_HUMAN_REVIEW_PENDING",
  protocol:null,cases:[],reviewers:[],reviews:[],adjudications:[],
  caution:"No human assessors or holdout cases have been supplied. Do not fabricate approvals."});
 console.log(JSON.stringify({created:intake,
  candidateCases:0,reviewers:0,scienceValidated:false,publicationAuthorised:false}));
}else if(action==="practice"){
 await ensurePrivate();
 const dataset=JSON.parse(await readFile("research/ai/evaluation-set-v1.json","utf8"));
 const pack=buildBlindPracticePack(dataset,{generatedAt:new Date().toISOString()});
 await writeOnce(practice,pack);
 console.log(JSON.stringify({created:practice,classification:pack.classification,
  caseCount:pack.caseCount,taskCounts:pack.taskCounts,excludedCount:pack.excluded.length,
  referenceLabelsIncluded:false,eligibleAsIndependentHeldOut:false,scienceValidated:false},null,2));
}else if(action==="audit"){
 const meta=await stat(intake);
 if((meta.mode&0o077)!==0)throw new Error("Private reviewer intake permissions must be 0600");
 const supplied=JSON.parse(await readFile(intake,"utf8"));
 if(supplied.schema!=="hpi_ai6_independent_review_intake_v1"||
   supplied.classification!=="PRIVATE_HUMAN_REVIEW_PENDING")
  throw new Error("Unexpected reviewer intake schema or classification");
 console.log(JSON.stringify(auditIndependentIntake(supplied),null,2));
}else{
 console.log("Usage: npm run ai:science:reviewers -- init | practice | audit");
 if(action!=="status")process.exitCode=2;
}
