/**
 * HPI-AI.6: explicitly approved tiny paid model pilot.
 * Distinct from the free-only/production providers. No general paid API route.
 */
export const PAID_SCIENCE_MODELS=Object.freeze({
 "deepseek/deepseek-v4.1-flash-1017": "Inceptron",
 "qwen/qwen3.8-27b": "Pearl Research",
 "anthropic/claude-sonnet-5.5": "Amazon Bedrock",
 "openai/gpt-6.2-sol": "Azure",
 "anthropic/claude-opus-5.5": "Amazon Bedrock"
});
export const MAX_PILOT_USD=0.25;
export const API="https://openrouter.ai/api/v1";
const isNum=v=>v!==null&&v!==undefined&&String(v).trim()!==""&&Number.isFinite(Number(v))&&Number(v)>=0;
export function verifyPaidZdrEndpoint({modelId,model,registry,endpoints,providerName}){
 if(PAID_SCIENCE_MODELS[modelId]!==providerName||model?.id!==modelId)
  throw new Error("Exact allowlisted model/provider identity mismatch");
 if(model?.architecture?.output_modalities?.join(",")!=="text")
  throw new Error("Pilot accepts text-only models");
 const eligible=(registry?.data??[]).filter(e=>e.model_id===modelId && e.provider_name===providerName && e.status===0);
 const live=(endpoints?.data?.endpoints??[]).filter(e=>e.provider_name===providerName && e.status===0);
 if(!eligible.length||!live.length)throw new Error("No live matching paid ZDR endpoint");
 const pairs=[];
 for(const r of eligible)for(const e of live){
  if(r.tag!==e.tag)continue;
  if(!["prompt","completion"].every(k=>isNum(r.pricing?.[k])&&isNum(e.pricing?.[k])))continue;
  pairs.push({r,e});
 }
 if(!pairs.length)throw new Error("Exact ZDR endpoint/price is unverified");
 // Fail if multiple matching routes have different max prices. One provider
 // may offer more than one quantization: choose conservative upper ceilings.
 const inputUsdPerMillion=Math.max(...pairs.flatMap(p=>[Number(p.r.pricing.prompt),Number(p.e.pricing.prompt)]))*1e6;
 const outputUsdPerMillion=Math.max(...pairs.flatMap(p=>[Number(p.r.pricing.completion),Number(p.e.pricing.completion)]))*1e6;
 if(!Number.isFinite(inputUsdPerMillion)||!Number.isFinite(outputUsdPerMillion)||
  inputUsdPerMillion<=0||outputUsdPerMillion<=0)throw new Error("Paid pricing ambiguous");
 return {modelId,providerName,matchedEndpointTags:[...new Set(pairs.map(p=>p.r.tag))],
  inputUsdPerMillion,outputUsdPerMillion,
  zdrVerifiedAtMetadata:true,trainingDeniedAtCallTimeRequired:true};
}
export function worstCaseReserveUsd(messages,maxTokens,route){
 if(!Array.isArray(messages)||!messages.length||!Number.isInteger(maxTokens)||maxTokens<1||maxTokens>1600)
  throw new Error("Invalid bounded prompt or max output");
 // Conservative upper bound: UTF-8 message bytes exceed normal input tokens.
 const inputTokenUpperBound=Buffer.byteLength(JSON.stringify(messages),"utf8")+200;
 if(inputTokenUpperBound>20000)throw new Error("Prompt input budget exceeded");
 return (inputTokenUpperBound*route.inputUsdPerMillion+
   maxTokens*route.outputUsdPerMillion)/1000000;
}
export function strictPaidRequest({route,messages,maxTokens}){
 if(!route?.zdrVerifiedAtMetadata||!route?.trainingDeniedAtCallTimeRequired)
  throw new Error("Paid ZDR and deny-policy route was not verified");
 if(PAID_SCIENCE_MODELS[route.modelId]!==route.providerName)
  throw new Error("Paid provider not allowlisted");
 if(!Number.isInteger(maxTokens)||maxTokens>1600||maxTokens<1)
  throw new Error("Excessive model output ceiling");
 return {model:route.modelId,messages,temperature:0,max_tokens:maxTokens,
  ...(route.modelId.startsWith("deepseek/")||route.modelId.startsWith("qwen/")?
   {reasoning:{effort:"low"}}:{}),
  stream:false,provider:{
   only:[route.providerName],allow_fallbacks:false,
   zdr:true,data_collection:"deny",
   max_price:{prompt:route.inputUsdPerMillion+1e-8,
    completion:route.outputUsdPerMillion+1e-8}
  }};
}
export function verifyAccountBudget(key,credits,{capUsd=MAX_PILOT_USD}={}){
 const k=key?.data,c=credits?.data;
 if(!(capUsd>0&&capUsd<=MAX_PILOT_USD))throw new Error("Pilot cap must not exceed 0.25 USD");
 if(!isNum(k?.limit)||!isNum(k?.limit_remaining)||!isNum(c?.total_credits)||!isNum(c?.total_usage))
  throw new Error("Key/account billing limits are not verifiable");
 if(Number(k.limit_remaining)<capUsd||Number(c.total_credits)-Number(c.total_usage)<capUsd)
  throw new Error("Insufficient prepaid credits or key hard credit cap");
 return {maxPilotUsd:capUsd,keyHardLimitPresent:true,accountCreditsAvailable:true};
}
