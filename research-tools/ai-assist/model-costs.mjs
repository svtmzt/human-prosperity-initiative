/** Read-only candidate cost ladder for HPI research-model procurement decisions.
 * Prices are public catalogue metadata, not a verified invoice nor permission
 * to run paid inference. No API-key access, POST, purchase, budget or billing.
 */
export const CANDIDATE_TIERS=Object.freeze([
 {tier:"free_cloud",models:["baidu/ernie-5.5-flash-preview:free","inclusionai/ling-3.2-flash:free"]},
 {tier:"economy",models:["deepseek/deepseek-v4.1-flash-1017","qwen/qwen3.8-27b","qwen/qwen4-max"]},
 {tier:"midrange",models:["google/gemini-4-hydrogen","openai/gpt-6.2-sol","anthropic/claude-sonnet-5.5"]},
 {tier:"frontier",models:["google/gemini-4-neon","anthropic/claude-opus-5.5","openai/gpt-6.2-astra"]},
 {tier:"frontier_premium",models:["openai/gpt-6.2-astra-pro","openai/gpt-5.5-pro"]}
]);
const parsePrice=x=>{
 if(typeof x!=="string"&&typeof x!=="number")return null;
 if(!/^(?:0|[0-9]+(?:\.[0-9]+)?)$/.test(String(x)))return null;
 const value=Number(x);
 return Number.isFinite(value)&&value>=0?value:null;
};
const round=x=>Math.round((x+Number.EPSILON)*1e8)/1e8;

/**
 * OpenRouter price is dollars PER TOKEN, not per million; rejected fields are
 * not misrepresented as free. Prices are not provider- or endpoint-verified.
 */
export function estimateInferenceCost(pricing,{requests=100,inputTokensEach=4000,
 outputTokensEach=1000}={}){
 if(!Number.isInteger(requests)||requests<1||requests>100000||
  !Number.isInteger(inputTokensEach)||inputTokensEach<1||inputTokensEach>1000000||
  !Number.isInteger(outputTokensEach)||outputTokensEach<1||outputTokensEach>1000000)
  throw new Error("Invalid bounded cost projection");
 const input=parsePrice(pricing?.prompt),output=parsePrice(pricing?.completion);
 const requestPrice=pricing?.request==null?0:parsePrice(pricing.request);
 if(input===null||output===null||requestPrice===null)return {known:false,reason:"incomplete_or_invalid_model_pricing"};
 return {known:true,currency:"USD",
  requests,inputTokensEach,outputTokensEach,
  listedUsdPerMillionInput:round(input*1_000_000),
  listedUsdPerMillionOutput:round(output*1_000_000),
  estimateUsd:round(requests*(inputTokensEach*input+outputTokensEach*output+requestPrice)),
  estimationOnly:true,
  exclusions:["provider-specific endpoint price changes","reasoning token overhead",
   "caching, tools, retrieval and search surcharges","provider minimums and taxes",
   "routing restrictions, availability and quota","independent review and human labour"]};
}

/** Enforce that all candidates are literal catalog IDs, not fuzzy aliases. */
export function buildCostLadder(catalogue,{fetchedAt,scenario}={}){
 if(!Array.isArray(catalogue)||!Number.isFinite(Date.parse(fetchedAt)))
  throw new Error("Price ladder requires a dated public model catalogue");
 const byId=new Map(catalogue.filter(x=>typeof x?.id==="string").map(x=>[x.id,x]));
 return {kind:"hpi_ai_read_only_cost_ladder",catalogueDate:fetchedAt,
  source:"https://openrouter.ai/api/v1/models",method:"GET public metadata ONLY; no inference",
  pricesAreEndpointVerified:false, privacyTermsIndependentlyVerified:false,
  purchaseAuthorised:false,paidModelExecutionAllowed:false,
  objective:"Compare approximate cost before separate quality and privacy evaluations, never rank by marketing claims",
  scenario:scenario??{requests:100,inputTokensEach:4000,outputTokensEach:1000},
  tiers:CANDIDATE_TIERS.map(group=>({tier:group.tier,
   candidates:group.models.map(id=>{
    const m=byId.get(id);
    const costs=m?estimateInferenceCost(m.pricing,scenario):{known:false,reason:"model_missing_from_catalogue"};
    return {id,availableInPublicCatalogue:!!m,contextLength:m?.context_length??null,
     supportsStructuredOutputs:m?.supported_parameters?.includes("structured_outputs")??false,
     ...costs,scientificAccuracyValidated:false,
     privacyEndpointEligible:null,actualPaidBenchmarkPerformed:false,
     independentHumanReview:false,
     execution:"blocked_until_explicit_authorisation"};
   })}))};
}

/** Stage planning only; never an executable paid routing instruction. */
export function planAccuracyFirstEscalation({candidateAssessments=[],paidApprovalRef=null}={}){
 if(paidApprovalRef)throw new Error("A paid model is never authorized by the planning function");
 const ready=candidateAssessments.filter(a=>a?.qualifiedForConsideration===true);
 return {decision:"experimental_research_and_independent_review_only",
  qualityQualifiedModels:ready.map(r=>({model:r.model,task:r.task})),
  publicationAuthorised:false,paidExecutionAuthorised:false,
  nextGates:[
   "independent expert adjudication of the existing references and a blinded external hold-out set",
   "retest existing models against identical held-out items with independent prompts and provenance",
   "recheck per-provider ZDR/no-training, region, endpoint eligibility, licensing and source data class",
   "compare at least one model per price tier only after explicit budget and account approvals",
   "escalate difficult or disputed cases to a stronger reviewed model, never claim model majority is scientific truth",
   "keep private raw inference, human review and non-publication boundaries intact"
  ]};
}
