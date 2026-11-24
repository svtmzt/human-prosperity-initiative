import test from "node:test";
import assert from "node:assert/strict";
import {validateClaimExtraction,validateMechanismTagging,buildGroundedMessages,promptFingerprint} from "../research-tools/ai-assist/safeguards.mjs";
const s={id:"synthetic",text:"Control 6.5%; information 11%; assistance 18%. Measured endpoint: Verified benefit enrolment at follow-up. The trial recorded no other outcome."};
const options={allowedMechanismIds:["M-PROCEDURAL-DENIAL","M-INFORMATION-FRICTIONS","M-COMPLIANCE-BURDEN"],endpointLevels:["receipt","interest","application","approval","sustained_participation"]};
const c={sourceId:s.id,statement:"Assistance 18%.",quote:"Control 6.5%; information 11%; assistance 18%.",endpointLevel:"receipt",direction:"supports",mechanismIds:[],confidence:.7};
const v=x=>validateClaimExtraction({claims:[{...c,...x}],abstain:false},[s],options);
test("every number belongs to exact evidence span, not merely a source elsewhere",()=>{
 assert.equal(v({}).status,"valid_pending_review");
 assert.equal(v({statement:"Assistance 18% compared with control 6.5%.",quote:"information 11%; assistance 18%. Measured endpoint:"}).status,"all_items_rejected");
 assert.equal(v({statement:"Control 6%."}).status,"all_items_rejected");
});
test("explicit verified enrolment endpoint is not interest, application, approval or sustained participation",()=>{
 const quote="Measured endpoint: Verified benefit enrolment at follow-up.";
 for(const endpointLevel of options.endpointLevels.slice(1))
 assert.match(v({quote,statement:"Verified enrolment was measured.",endpointLevel}).rejected[0].reasons.join(),/Endpoint conflicts/);
 assert.equal(v({quote,statement:"Verified enrolment was measured.",endpointLevel:"receipt"}).status,"valid_pending_review");
});
test("procedural denial requires an explicit refusal or rejection citation, assistance alone insufficient",()=>{
 const tag={mechanismId:"M-PROCEDURAL-DENIAL",quote:"information 11%; assistance 18%.",rationale:"Assistance targets paperwork."};
 assert.equal(validateMechanismTagging({sourceId:s.id,mechanisms:[tag]},[s],options).status,"all_items_rejected");
 assert.equal(v({mechanismIds:["M-PROCEDURAL-DENIAL"]}).status,"all_items_rejected");
 const denied={id:s.id,text:"Applications were rejected for missing documentation."};
 assert.equal(validateMechanismTagging({sourceId:s.id,mechanisms:[{...tag,quote:denied.text}]},[denied],options).status,"valid_pending_review");
});
test("versioned general definitions clarify endpoints and mechanisms without source-specific labels",()=>{
 const m=buildGroundedMessages("claim-extraction",[s],options);
 assert.match(m[0].content,/Sustained participation requires evidence of ongoing/);
 assert.match(m[0].content,/Do not equate claiming or tax filing with money received/);
 assert.match(m[0].content,/Assistance alone does not establish a denial/);
 assert.equal(promptFingerprint("claim-extraction").id,"claim-extraction@1.2.0");
 assert.equal(promptFingerprint("mechanism-tagging").id,"mechanism-tagging@1.1.0");
 assert.ok(!m[0].content.includes("6.5%"));
});
