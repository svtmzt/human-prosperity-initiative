/**
 * Inference provider adapters, request budget, retry policy and circuit
 * breaker. The disabled provider never performs network access. Every failure
 * maps to an explicit non-success status; no adapter fabricates a response.
 *
 * Failure scopes:
 *  - account:  auth, payment/credit, exhausted free quota, budget/guardrail
 *              blocks, a non-zero reported cost, an unexpected served model.
 *              The circuit breaker opens and NO further request is sent in
 *              this run, to any model.
 *  - model:    this model is unavailable (upstream rate limit, no endpoint
 *              matching the data policy, gated, removed). The next explicitly
 *              permitted free model may be tried.
 *  - transient: timeout, 5xx, per-minute limit. Bounded retry with backoff on
 *              the same model.
 *  - request:  context limit, refusal, bad request, invalid output. No retry.
 */
import {OPENROUTER_BASE_URL} from "./config.mjs";

export class RequestBudget{
 constructor({maxRequests,maxInputChars}){this.maxRequests=maxRequests;this.maxInputChars=maxInputChars;this.requests=0;this.inputChars=0}
 /** Reserve capacity for one request; returns false (and reserves nothing) when a ceiling would be exceeded. */
 reserve(inputChars){
  if(this.requests+1>this.maxRequests||this.inputChars+inputChars>this.maxInputChars)return false;
  this.requests++;this.inputChars+=inputChars;return true;
 }
 snapshot(){return {requestsUsed:this.requests,maxRequests:this.maxRequests,inputCharsUsed:this.inputChars,maxInputChars:this.maxInputChars}}
}

export const ACCOUNT_STATUSES=Object.freeze(["auth_error","payment_required","quota_exhausted","budget_or_guardrail_block","cost_violation","model_mismatch","attempt_ceiling_reached","daily_ceiling_reached"]);
export const MODEL_STATUSES=Object.freeze(["rate_limited_upstream","no_compliant_endpoint","model_not_found","model_gated","model_not_permitted"]);
export const TRANSIENT_STATUSES=Object.freeze(["timeout","provider_unavailable","rate_limited_minute","unavailable"]);

export class CircuitBreaker{
 constructor(){this.state="closed";this.status=null;this.reason=null}
 trip(status,reason){if(this.state==="open")return;this.state="open";this.status=status;this.reason=reason}
 get open(){return this.state==="open"}
 snapshot(){return {state:this.state,status:this.status,reason:this.reason}}
}

export function createDisabledProvider(reason="No inference provider configured."){
 return {id:"disabled",kind:"disabled",available:false,
  async complete(){return {ok:false,status:"disabled",reason}}};
}

const headerGet=(headers,name)=>{if(!headers)return null;if(typeof headers.get==="function")return headers.get(name);const k=Object.keys(headers).find(h=>h.toLowerCase()===name.toLowerCase());return k?headers[k]:null};
const sleepReal=ms=>new Promise(r=>setTimeout(r,ms));

/** Classify an HTTP error response into a status, scope and optional wait. */
export function classifyHttpError(httpStatus,body,headers,{now=Date.now(),maxWaitMs=65000}={}){
 const err=body?.error&&typeof body.error==="object"?body.error:{};
 const msg=String(err.message||"")+" "+String(err.metadata?.raw||"");
 const meta=err.metadata&&typeof err.metadata==="object"?err.metadata:{};
 const errorType=String(meta.error_type||"");
 const retryAfterS=Number(headerGet(headers,"retry-after"));
 const retryAfterMs=Number.isFinite(retryAfterS)&&retryAfterS>=0?retryAfterS*1000:null;
 const r=(status,scope,reason,extra={})=>({status,scope,reason,httpStatus,retryAfterMs,...extra});
 if(httpStatus===401)return r("auth_error","account","Authentication failed (HTTP 401): the API key is missing, invalid or disabled.");
 if(httpStatus===402)return r("payment_required","account","OpenRouter reports insufficient credits or a negative balance (HTTP 402). HPI never purchases credits or upgrades plans; this run stops.");
 if(httpStatus===403){
  if(/agentic harness|only available on/i.test(msg))return r("model_gated","model","This free model is gated by the provider for this kind of client (HTTP 403).");
  if(errorType==="content_policy_violation"||errorType==="refusal"||meta.flagged_input||Array.isArray(meta.reasons))return r("refusal","request","The request was declined by a content filter or the model (HTTP 403).");
  return r("budget_or_guardrail_block","account","Request blocked by a key limit, budget or guardrail (HTTP 403).");
 }
 if(httpStatus===404){
  if(/data policy/i.test(msg)||meta.failed_routing_step==="Filter by Data Policy")return r("no_compliant_endpoint","model","No endpoint of this model satisfies the required data policy (prompts must not be collected or trained on).");
  return r("model_not_found","model","Model not found (HTTP 404); it may have been removed from the catalogue.");
 }
 if(httpStatus===408)return r("timeout","transient","Provider timed out (HTTP 408).");
 if(httpStatus===413)return r("context_limit","request","Request too large for the provider (HTTP 413).");
 if(httpStatus===400){
  if(/context|too long|maximum.*tokens|token limit|exceeds/i.test(msg))return r("context_limit","request","Input exceeds the model context window (HTTP 400).");
  if(/response_format|json_schema|json_object|structured|parameter|not supported|unsupported/i.test(msg))return r("unsupported_parameter","request","The model rejected a request parameter (HTTP 400): "+msg.trim().slice(0,160));
  return r("bad_request","request","Provider rejected the request (HTTP 400): "+msg.trim().slice(0,160));
 }
 if(httpStatus===429){
  if(meta.limit_source==="upstream_provider_shared_pool")return r("rate_limited_upstream","model","The free model's upstream provider is rate-limited for all users right now (shared pool).");
  const remaining=headerGet(headers,"x-ratelimit-remaining"),reset=Number(headerGet(headers,"x-ratelimit-reset"));
  const limit=Number(headerGet(headers,"x-ratelimit-limit"));
  if(/per[- ]day|daily|free-models-per-day/i.test(msg)||(remaining==="0"&&Number.isFinite(reset)&&reset-now>120000))
   return r("quota_exhausted","account","The account's free-model daily quota is exhausted"+(Number.isFinite(limit)?" ("+limit+" requests)":"")+". It resets at "+(Number.isFinite(reset)?new Date(reset).toISOString():"the next UTC day")+". No other model is tried; no credit purchase is made.");
  const wait=Number.isFinite(reset)&&reset>now?reset-now:retryAfterMs;
  if(wait!==null&&wait<=maxWaitMs)return r("rate_limited_minute","transient","Per-minute free-model limit reached; waiting before one bounded retry.",{retryAfterMs:wait});
  return r("quota_exhausted","account","Rate limited (HTTP 429) without a short reset; stopping to avoid consuming quota.");
 }
 if(httpStatus===503&&/no (?:available )?(?:model )?provider|routing requirements|no endpoints/i.test(msg))return r("no_compliant_endpoint","model","No provider currently meets the routing requirements (HTTP 503).");
 if(httpStatus>=500)return r("provider_unavailable","transient","Provider error (HTTP "+httpStatus+").");
 return r("http_error","request","Provider returned HTTP "+httpStatus+".");
}

/** Interpret a 200 chat-completions body. Never accepts truncated or empty output. */
export function interpretCompletion(data,{acceptableModelIds=null}={}){
 if(data?.error)return {ok:false,status:"provider_error",scope:"request",reason:"Provider reported an error in a 200 response: "+String(data.error.message||"").slice(0,160)};
 const choice=data?.choices?.[0];
 if(!choice||typeof choice!=="object")return {ok:false,status:"malformed_response",scope:"request",reason:"Provider response has no choices."};
 const message=choice.message||{};
 const usage=data.usage&&typeof data.usage==="object"?data.usage:null;
 const u={promptTokens:usage?.prompt_tokens??null,completionTokens:usage?.completion_tokens??null,
  reasoningTokens:usage?.completion_tokens_details?.reasoning_tokens??null,costUsd:typeof usage?.cost==="number"?usage.cost:null};
 const base={model:data.model??null,providerName:typeof data.provider==="string"?data.provider:null,generationId:typeof data.id==="string"?data.id:null,usage:u,finishReason:choice.finish_reason??null};
 if(acceptableModelIds&&!acceptableModelIds.includes(data.model))return {ok:false,status:"model_mismatch",scope:"account",reason:"Provider served model '"+String(data.model).slice(0,80)+"' instead of the requested free model; output discarded.",...base};
 if(u.costUsd!==null&&u.costUsd>0)return {ok:false,status:"cost_violation",scope:"account",reason:"Provider reported a non-zero cost ($"+u.costUsd+") for a request that must be free; output discarded and run stopped.",...base};
 if(typeof message.refusal==="string"&&message.refusal.trim()||choice.finish_reason==="content_filter")return {ok:false,status:"refusal",scope:"request",reason:"The model declined to answer or the output was filtered.",...base};
 const content=typeof message.content==="string"?message.content:"";
 if(choice.finish_reason==="length")return {ok:false,status:"truncated",scope:"request",reason:"Output was truncated at the token limit; partial output is never accepted.",...base};
 if(!content.trim()){
  const reasoningText=[message.reasoning,message.reasoning_content].some(x=>typeof x==="string"&&x.trim());
  const exhausted=reasoningText||u.reasoningTokens!==null&&u.completionTokens!==null&&u.completionTokens>0&&u.reasoningTokens>=u.completionTokens*0.9;
  return {ok:false,status:exhausted?"reasoning_budget_exhausted":"empty_output",scope:"request",reason:exhausted?"The model spent its token budget on reasoning and returned no answer.":"Provider response has no message content.",...base};
 }
 return {ok:true,status:"completed",content,...base};
}

/** Structured-output modes to try for a catalogue entry, most constrained first. */
export function structuredModesFor(entry,{schema}={}){
 const modes=[];
 if(schema&&entry?.supportsStructuredOutputs)modes.push("json_schema");
 if(entry?.supportsResponseFormat)modes.push("json_object");
 modes.push("prompt_only");
 return modes;
}
const PROMPT_ONLY_SUFFIX="\n\nOutput format: reply with ONE JSON object only. No prose, no markdown fences, no commentary before or after the JSON.";
function withPromptOnly(messages){return messages.map((m,i)=>i===0&&m.role==="system"?{...m,content:m.content+PROMPT_ONLY_SUFFIX}:m)}

/** Build an OpenRouter chat-completions body that cannot route to a paid model. */
export function buildOpenRouterBody({entry,messages,maxTokens,schema,mode,dataPolicy="deny_collection",reasoningAllowance=3000,seed=7}){
 const body={model:entry.id,messages:mode==="prompt_only"?withPromptOnly(messages):messages,temperature:0};
 const reasoning=entry.reasoning||{};
 let tokens=maxTokens;
 if(reasoning.supported&&reasoning.mandatory){tokens=maxTokens+reasoningAllowance;body.reasoning={exclude:true}}
 else if(reasoning.supported)body.reasoning={effort:"none"}; // optional reasoning is always disabled: it consumes the answer budget
 if(entry.maxCompletionTokens)tokens=Math.min(tokens,entry.maxCompletionTokens);
 body.max_tokens=tokens;
 if(entry.supportsSeed)body.seed=seed;
 if(mode==="json_schema")body.response_format={type:"json_schema",json_schema:{name:schema.name,strict:true,schema:schema.schema}};
 else if(mode==="json_object")body.response_format={type:"json_object"};
 body.provider={allow_fallbacks:false,require_parameters:mode!=="prompt_only",data_collection:"deny",
  ...(dataPolicy==="zdr"?{zdr:true}:{}),max_price:{prompt:0,completion:0,request:0,image:0}};
 body.usage={include:true};
 return body;
}

async function postJson(fetchImpl,url,headers,body,timeoutMs){
 const started=Date.now();
 let response;
 try{response=await fetchImpl(url,{method:"POST",redirect:"error",signal:AbortSignal.timeout(timeoutMs),headers,body:JSON.stringify(body)})}
 catch(error){return {networkError:true,status:error?.name==="TimeoutError"?"timeout":"unavailable",reason:"Inference request failed: "+(error?.message||"network error"),latencyMs:Date.now()-started}}
 let data=null,parseError=false;
 try{data=await response.json()}catch{parseError=true}
 return {httpStatus:response.status,ok:response.ok,data,parseError,headers:response.headers,latencyMs:Date.now()-started};
}

/**
 * Generic OpenAI-compatible adapter (legacy `openai_compatible` and `local`).
 * Requests JSON mode first; if the server rejects response_format, retries
 * once without it and relies on the prompt plus strict validation.
 */
export function createOpenAiCompatibleProvider(config,{fetchImpl=globalThis.fetch,apiKey,model:modelOverride}={}){
 if(!config?.available||!["openai_compatible","local"].includes(config.provider))return createDisabledProvider(config?.reasonDisabled||"Provider not available.");
 const kind=config.provider;
 return {id:kind,kind,boundary:config.boundary,available:true,model:modelOverride||config.model,
  async complete(messages,{maxTokens=config.maxOutputTokens,model=modelOverride||config.model}={}){
   if(!model)return {ok:false,status:"no_model",reason:"No model configured or discovered for the local runtime."};
   const url=config.baseUrl+"/v1/chat/completions";
   const headers={"content-type":"application/json",...(apiKey?{authorization:"Bearer "+apiKey}:{})};
   const attempts=[];
   for(const mode of ["json_object","prompt_only"]){
    const body={model,messages:mode==="prompt_only"?withPromptOnly(messages):messages,temperature:0,max_tokens:maxTokens,...(mode==="json_object"?{response_format:{type:"json_object"}}:{})};
    const r=await postJson(fetchImpl,url,headers,body,config.timeoutMs);
    if(r.networkError){attempts.push({model,mode,status:r.status});return {ok:false,status:r.status,reason:r.reason,attempts}}
    if(r.httpStatus===429){attempts.push({model,mode,status:"rate_limited"});return {ok:false,status:"rate_limited",reason:"Provider rate limit (HTTP 429).",attempts}}
    if(r.httpStatus===400&&mode==="json_object"&&/response_format|json/i.test(JSON.stringify(r.data||""))){attempts.push({model,mode,status:"unsupported_parameter"});continue}
    if(!r.ok){attempts.push({model,mode,status:"http_error"});return {ok:false,status:"http_error",reason:"Provider returned HTTP "+r.httpStatus,attempts}}
    if(r.parseError){attempts.push({model,mode,status:"malformed_response"});return {ok:false,status:"malformed_response",reason:"Provider response is not JSON.",attempts}}
    const v=interpretCompletion(r.data);
    attempts.push({model,mode,status:v.status,latencyMs:r.latencyMs});
    if(!v.ok)return {...v,attempts};
    return {...v,model:v.model??model,requestedModel:model,structuredMode:mode,latencyMs:r.latencyMs,costVerified:kind==="local",attempts};
   }
   return {ok:false,status:"unsupported_parameter",reason:"Server rejected the request in every structured-output mode.",attempts};
  }};
}

/** Discover models served by a loopback OpenAI-compatible runtime. */
export async function discoverLocalModels(config,{fetchImpl=globalThis.fetch,apiKey}={}){
 if(config?.provider!=="local"||!config.available)return {ok:false,status:"disabled",models:[],reason:config?.reasonDisabled||"Local provider not configured."};
 const headers={accept:"application/json",...(apiKey?{authorization:"Bearer "+apiKey}:{})};
 const tryGet=async path=>{
  try{const r=await fetchImpl(config.baseUrl+path,{method:"GET",redirect:"error",headers,signal:AbortSignal.timeout(Math.min(config.timeoutMs,5000))});
   if(!r.ok)return {ok:false,status:"http_error",reason:"HTTP "+r.status};return {ok:true,data:await r.json()}}
  catch(error){return {ok:false,status:error?.name==="TimeoutError"?"timeout":"unavailable",reason:error?.message||"network error"}}
 };
 const openai=await tryGet("/v1/models");
 if(openai.ok&&Array.isArray(openai.data?.data))return {ok:true,status:"discovered",source:"/v1/models",models:openai.data.data.map(m=>String(m.id)).filter(Boolean).sort()};
 if(config.runtime==="ollama"){
  const tags=await tryGet("/api/tags");
  if(tags.ok&&Array.isArray(tags.data?.models))return {ok:true,status:"discovered",source:"/api/tags",models:tags.data.models.map(m=>String(m.name||m.model)).filter(Boolean).sort()};
 }
 return {ok:false,status:openai.status||"unavailable",models:[],reason:"Local runtime "+config.runtimeLabel+" at "+config.baseUrl+" is not reachable or returned no model list ("+(openai.reason||"no data")+"). Start it locally; it must stay bound to loopback."};
}

/**
 * Ollama native chat API (/api/chat). Preferred over Ollama's OpenAI-compatible
 * /v1 endpoint because only the native API reliably accepts `think:false`
 * (reasoning models such as Qwen 3.5 otherwise spend the budget thinking),
 * a JSON-schema `format`, and an explicit context window (`options.num_ctx`;
 * Ollama's small default window silently truncates grounded prompts).
 * done_reason "length" is a truncation and is never accepted.
 */
export function buildOllamaBody({model,messages,maxTokens,schema,mode,numCtx,think=false,seed=7}){
 const body={model,messages:mode==="prompt_only"?withPromptOnly(messages):messages,stream:false,
  options:{temperature:0,seed,num_predict:maxTokens,num_ctx:numCtx}};
 if(think!==null)body.think=think;
 if(mode==="json_schema"&&schema)body.format=schema.schema;
 else if(mode==="json_object")body.format="json";
 return body;
}
export function interpretOllama(data){
 if(data?.error)return {ok:false,status:"provider_error",scope:"request",reason:"Ollama error: "+String(data.error).slice(0,160)};
 const msg=data?.message;
 if(!msg||typeof msg!=="object")return {ok:false,status:"malformed_response",scope:"request",reason:"Ollama response has no message."};
 const usage={promptTokens:data.prompt_eval_count??null,completionTokens:data.eval_count??null,reasoningTokens:null,costUsd:null};
 const base={model:data.model??null,providerName:"ollama-local",generationId:null,usage,finishReason:data.done_reason??null};
 const content=typeof msg.content==="string"?msg.content:"";
 const thinking=typeof msg.thinking==="string"&&msg.thinking.trim().length>0;
 if(data.done_reason==="length")return {ok:false,status:"truncated",scope:"request",reason:"Ollama stopped at the token or context limit (done_reason=length)"+(thinking?" while reasoning; thinking could not be disabled for this model":"")+". Raise HPI_AI_MAX_OUTPUT_TOKENS or HPI_AI_LOCAL_NUM_CTX; partial output is never accepted.",...base};
 if(!content.trim())return {ok:false,status:thinking?"reasoning_budget_exhausted":"empty_output",scope:"request",reason:thinking?"The model produced only reasoning text and no answer.":"Ollama returned no message content.",...base};
 return {ok:true,status:"completed",content,...base};
}
export function createOllamaNativeProvider(config,{fetchImpl=globalThis.fetch,apiKey,model}={}){
 const headers={"content-type":"application/json",...(apiKey?{authorization:"Bearer "+apiKey}:{})};
 return {id:"local",kind:"local",boundary:"local",available:true,model,api:"ollama_native",
  async complete(messages,{maxTokens=config.maxOutputTokens,schema=null}={}){
   const attempts=[];
   let think=false;
   const modes=schema?["json_schema","json_object","prompt_only"]:["json_object","prompt_only"];
   for(let i=0;i<modes.length;i++){
    const mode=modes[i];
    const r=await postJson(fetchImpl,config.baseUrl+"/api/chat",headers,buildOllamaBody({model,messages,maxTokens,schema,mode,numCtx:config.numCtx,think}),config.timeoutMs);
    if(r.networkError){attempts.push({model,mode,status:r.status});return {ok:false,status:r.status,reason:r.reason,attempts}}
    const errText=JSON.stringify(r.data||"");
    if(r.httpStatus===400&&think!==null&&/think/i.test(errText)){attempts.push({model,mode,status:"think_unsupported"});think=null;i--;continue}
    if(r.httpStatus===400&&/format|schema|json/i.test(errText)&&i<modes.length-1){attempts.push({model,mode,status:"unsupported_parameter"});continue}
    if(!r.ok){attempts.push({model,mode,status:"http_error"});return {ok:false,status:"http_error",reason:"Ollama returned HTTP "+r.httpStatus+": "+errText.slice(0,160),attempts}}
    if(r.parseError){attempts.push({model,mode,status:"malformed_response"});return {ok:false,status:"malformed_response",reason:"Ollama response is not JSON.",attempts}}
    const v=interpretOllama(r.data);
    attempts.push({model,mode,status:v.status,latencyMs:r.latencyMs});
    if(!v.ok)return {...v,attempts,requestedModel:model,structuredMode:mode};
    return {...v,model:v.model??model,requestedModel:model,structuredMode:mode,latencyMs:r.latencyMs,costVerified:true,costVerification:"local_no_cost",attempts,
     parameters:{think,numCtx:config.numCtx,numPredict:maxTokens}};
   }
   return {ok:false,status:"unsupported_parameter",reason:"Ollama rejected every structured-output mode.",attempts};
  }};
}

/** Local provider: loopback runtime with model discovery when no model is configured. */
export async function createLocalProvider(config,{fetchImpl=globalThis.fetch,apiKey}={}){
 if(config?.provider!=="local"||!config.available)return {provider:createDisabledProvider(config?.reasonDisabled||"Local provider not configured."),discovery:null};
 const discovery=await discoverLocalModels(config,{fetchImpl,apiKey});
 if(!discovery.ok)return {provider:{...createDisabledProvider(discovery.reason),id:"local",kind:"local",offline:true},discovery};
 let model=config.model;
 if(model&&!discovery.models.includes(model))return {provider:createDisabledProvider("Configured model '"+model+"' is not served by the local runtime. Available: "+discovery.models.slice(0,10).join(", ")),discovery};
 if(!model)model=discovery.models[0]||null;
 if(!model)return {provider:createDisabledProvider("The local runtime serves no models."),discovery};
 const provider=config.runtime==="ollama"&&config.localApi!=="openai"
  ?createOllamaNativeProvider(config,{fetchImpl,apiKey,model})
  :createOpenAiCompatibleProvider(config,{fetchImpl,apiKey,model});
 return {provider,discovery,model};
}

/**
 * OpenRouter free-only provider. `models` is the ordered list of permitted
 * catalogue entries (primary first, then explicitly permitted free
 * fallbacks); every entry must be verified_free. Nothing else is ever sent.
 */
export function createOpenRouterProvider(config,{fetchImpl=globalThis.fetch,apiKey,models=[],breaker=new CircuitBreaker(),quota=null,
 sleep=sleepReal,now=()=>Date.now(),schemaFor=()=>null,maxWaitMs=65000,allowFallback=true,modelFailureThreshold=3,upstreamRetries=0,upstreamWaitMs=20000}={}){
 if(config?.provider!=="openrouter")return createDisabledProvider("Not an OpenRouter configuration.");
 if(!apiKey)return createDisabledProvider(config.reasonDisabled||"OpenRouter API key is not configured.");
 const permitted=models.filter(m=>m&&m.costClass==="verified_free"&&m.eligibleFreeText);
 if(!permitted.length)return createDisabledProvider("No verified free model is available for this task (catalogue stale, model not free, or removed).");
 if(permitted.length!==models.length)return createDisabledProvider("Refusing configuration: a requested model is not a verified free text model.");
 const maxAttempts=config.maxRequests*(1+config.maxRetries)+permitted.length;
 let attemptsUsed=0,lastAt=0;
 // Per-model breaker: after `modelFailureThreshold` consecutive availability
 // failures, a model is skipped for the rest of the run without any request.
 const modelFailures=new Map();
 const headers={"content-type":"application/json",authorization:"Bearer "+apiKey,
  "HTTP-Referer":"https://human-prosperity-initiative.vercel.app","X-Title":"HPI research assistance"};
 const pace=async()=>{const wait=lastAt+config.minIntervalMs-now();if(wait>0)await sleep(wait);lastAt=now()};
 return {id:"openrouter",kind:"openrouter",boundary:"free_cloud",available:true,model:permitted[0].id,models:permitted.map(m=>m.id),breaker,
  get attemptsUsed(){return attemptsUsed},
  modelHealth(){return Object.fromEntries(modelFailures)},
  async complete(messages,{maxTokens=config.maxOutputTokens,task=null,schema:explicitSchema=null}={}){
   const attempts=[];
   const fail=(status,reason,scope)=>({ok:false,status,reason,scope,attempts});
   if(breaker.open)return fail("circuit_open","Circuit breaker open: "+breaker.reason,"account");
   const schema=explicitSchema||schemaFor(task);
   const chain=allowFallback?permitted:permitted.slice(0,1);
   let last=null;
   for(const entry of chain){
    if((modelFailures.get(entry.id)||0)>=modelFailureThreshold){
     attempts.push({model:entry.id,mode:null,status:"model_circuit_open",httpStatus:null,latencyMs:0,providerName:null});
     last={status:"model_circuit_open",scope:"model",reason:"Model "+entry.id+" failed "+modelFailureThreshold+" times in a row in this run (last: "+(last?.status||"unavailable")+"); skipped without a request."};
     continue;
    }
    const modes=structuredModesFor(entry,{schema});
    let modeIndex=0,retries=0,upstream=0;
    while(modeIndex<modes.length){
     if(breaker.open)return fail("circuit_open","Circuit breaker open: "+breaker.reason,"account");
     if(attemptsUsed>=maxAttempts){breaker.trip("attempt_ceiling_reached","Per-run attempt ceiling ("+maxAttempts+") reached; no further requests.");return fail("attempt_ceiling_reached",breaker.reason,"account")}
     if(quota){const q=await quota.reserve();if(!q.ok){breaker.trip("daily_ceiling_reached","Application daily request ceiling ("+q.limit+") reached for "+q.day+" UTC.");return fail("daily_ceiling_reached",breaker.reason,"account")}}
     const mode=modes[modeIndex];
     const body=buildOpenRouterBody({entry,messages,maxTokens,schema,mode,dataPolicy:config.dataPolicy});
     await pace();
     attemptsUsed++;
     const r=await postJson(fetchImpl,OPENROUTER_BASE_URL+"/chat/completions",headers,body,config.timeoutMs);
     let outcome;
     if(r.networkError)outcome={status:r.status,scope:"transient",reason:r.reason,retryAfterMs:null};
     else if(!r.ok)outcome=classifyHttpError(r.httpStatus,r.data,r.headers,{now:now(),maxWaitMs});
     else if(r.parseError)outcome={status:"malformed_response",scope:"request",reason:"Provider response is not JSON."};
     else{
      const acceptable=[entry.id,...(entry.canonicalSlug?[entry.canonicalSlug+":free",entry.canonicalSlug]:[])];
      outcome=interpretCompletion(r.data,{acceptableModelIds:acceptable});
     }
     attempts.push({model:entry.id,mode,status:outcome.status,httpStatus:r.httpStatus??null,latencyMs:r.latencyMs,providerName:outcome.providerName??null});
     if(outcome.ok){
      modelFailures.set(entry.id,0);
      return {...outcome,requestedModel:entry.id,structuredMode:mode,latencyMs:r.latencyMs,
       costVerified:outcome.usage.costUsd===0,costVerification:outcome.usage.costUsd===0?"provider_reported_zero_cost":"catalogue_pricing_only",
       fellBack:entry!==chain[0],attempts};
     }
     last=outcome;
     if(outcome.scope==="account"){breaker.trip(outcome.status,outcome.reason);return {...fail(outcome.status,outcome.reason,"account"),model:outcome.model,usage:outcome.usage}}
     if(outcome.status==="unsupported_parameter"){modeIndex++;continue}
     if(outcome.status==="rate_limited_upstream"&&upstream<upstreamRetries){upstream++;await sleep(Math.min(upstreamWaitMs*upstream,maxWaitMs));continue}
     if(outcome.scope==="transient"&&retries<config.maxRetries){
      retries++;
      const wait=outcome.retryAfterMs??Math.min(2000*2**(retries-1),8000);
      if(wait>maxWaitMs)break;
      await sleep(wait);continue;
     }
     if(outcome.scope==="model"||outcome.scope==="transient"){modelFailures.set(entry.id,(modelFailures.get(entry.id)||0)+1);break} // try the next permitted free model
     return {...fail(outcome.status,outcome.reason,outcome.scope),model:outcome.model??entry.id,usage:outcome.usage??null};
    }
   }
   return fail(last?.status||"unavailable",(last?.reason||"No permitted free model answered.")+(chain.length>1?" All "+chain.length+" permitted free models were tried; no paid fallback exists.":""),last?.scope||"model");
  }};
}
