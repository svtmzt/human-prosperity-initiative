/**
 * AI research-assistance configuration. Disabled by default.
 *
 * Providers (HPI_AI_PROVIDER):
 *  - "disabled" (default): no network access at all.
 *  - "local": an OpenAI-compatible runtime on loopback only (Ollama, LM Studio,
 *    llama.cpp server, LiteLLM). Model discovered from the runtime when unset.
 *  - "openrouter": verified FREE OpenRouter models only. The base URL is fixed
 *    (no user-supplied URL, so no SSRF surface); paid models are refused in
 *    code and every request carries provider.max_price = 0, no fallback models
 *    array and data_collection = "deny".
 *  - "openai_compatible": legacy generic adapter. Loopback allowed; remote hosts
 *    must be HTTPS and allowlisted; known paid hosts (including openrouter.ai,
 *    because this adapter has no free-only enforcement) are refused unless a
 *    recorded cost approval reference is supplied.
 *
 * The API key value is never stored in the returned object; only its presence.
 */
export const KNOWN_PAID_HOSTS=Object.freeze([
 "api.openai.com","api.anthropic.com","openrouter.ai","api.mistral.ai","api.groq.com",
 "generativelanguage.googleapis.com","api.together.xyz","api.fireworks.ai","api.cohere.com","api.deepseek.com"
]);
export const PROVIDER_KINDS=Object.freeze(["disabled","local","openrouter","openai_compatible"]);
export const OPENROUTER_BASE_URL="https://openrouter.ai/api/v1";
export const OPENROUTER_HOST="openrouter.ai";
export const LOCAL_RUNTIMES=Object.freeze({
 ollama:{label:"Ollama",defaultBaseUrl:"http://127.0.0.1:11434"},
 litellm:{label:"LiteLLM proxy",defaultBaseUrl:"http://127.0.0.1:4000"},
 lmstudio:{label:"LM Studio",defaultBaseUrl:"http://127.0.0.1:1234"},
 llamacpp:{label:"llama.cpp server",defaultBaseUrl:"http://127.0.0.1:8080"},
 other:{label:"Other OpenAI-compatible local server",defaultBaseUrl:null}
});
export const OPENROUTER_DATA_POLICIES=Object.freeze({
 deny_collection:"Route only to endpoints OpenRouter reports as not collecting or training on prompts (provider.data_collection=deny).",
 zdr:"Route only to endpoints on OpenRouter's Zero Data Retention list (provider.zdr=true) and deny data collection."
});
const LOOPBACK=new Set(["localhost","127.0.0.1","[::1]","::1"]);
const MODEL_RE=/^[A-Za-z0-9._:\/@-]{1,160}$/;
const APPROVAL_RE=/^https:\/\/github\.com\/svtmzt\/[a-z0-9-]+\/issues\/\d+$/;
const int=(v,fallback,min,max)=>{const n=v===undefined||v===""?fallback:Number(v);if(!Number.isInteger(n)||n<min||n>max)throw new Error("AI config: integer out of range ("+min+"-"+max+"): "+v);return n};
const list=v=>String(v||"").split(",").map(s=>s.trim()).filter(Boolean);

function parseBaseUrl(value){
 let url;
 try{url=new URL(value||"")}catch{return {error:"HPI_AI_BASE_URL is missing or invalid."}}
 if(url.username||url.password)return {error:"Credentials must not be embedded in HPI_AI_BASE_URL."};
 if(url.search||url.hash)return {error:"HPI_AI_BASE_URL must not contain a query string or fragment."};
 const host=url.hostname.toLowerCase();
 return {url,host,loopback:LOOPBACK.has(host),baseUrl:url.origin+url.pathname.replace(/\/+$/,"").replace(/\/v1$/,"")};
}

export function readAiConfig(env={}){
 const provider=(env.HPI_AI_PROVIDER||"disabled").trim();
 const apiKeyPresent=Boolean(env.HPI_AI_API_KEY||(provider==="openrouter"&&env.OPENROUTER_API_KEY));
 const base={provider:"disabled",kind:"disabled",boundary:null,available:false,model:null,baseHost:null,apiKeyPresent,
  maxRequests:int(env.HPI_AI_MAX_REQUESTS,20,1,500),maxInputChars:int(env.HPI_AI_MAX_INPUT_CHARS,12000,500,200000),
  maxOutputTokens:int(env.HPI_AI_MAX_OUTPUT_TOKENS,800,64,8000),timeoutMs:int(env.HPI_AI_TIMEOUT_MS,30000,1000,300000),
  maxRetries:int(env.HPI_AI_MAX_RETRIES,1,0,3),dailyRequestCeiling:int(env.HPI_AI_DAILY_REQUEST_CEILING,40,1,1000),
  minIntervalMs:int(env.HPI_AI_MIN_INTERVAL_MS,provider==="openrouter"?3500:0,0,120000),
  dataClass:(env.HPI_AI_DATA_CLASS||"public_research_metadata").trim(),
  paidUseApprovalRef:null,freeOnly:false,warnings:[],
  reasonDisabled:"No inference provider configured (HPI_AI_PROVIDER is unset or 'disabled')."};
 if(provider==="disabled")return base;
 if(!PROVIDER_KINDS.includes(provider))return {...base,reasonDisabled:"Unsupported provider '"+provider+"'. Use one of: "+PROVIDER_KINDS.join(", ")+"."};
 const model=(env.HPI_AI_MODEL||"").trim();
 if(model&&!MODEL_RE.test(model))return {...base,reasonDisabled:"HPI_AI_MODEL is invalid."};

 if(provider==="local"){
  const runtime=(env.HPI_AI_LOCAL_RUNTIME||"ollama").trim();
  if(!LOCAL_RUNTIMES[runtime])return {...base,reasonDisabled:"Unknown HPI_AI_LOCAL_RUNTIME '"+runtime+"'. Use one of: "+Object.keys(LOCAL_RUNTIMES).join(", ")+"."};
  const parsed=parseBaseUrl(env.HPI_AI_BASE_URL||LOCAL_RUNTIMES[runtime].defaultBaseUrl);
  if(parsed.error)return {...base,reasonDisabled:parsed.error};
  if(!parsed.loopback)return {...base,reasonDisabled:"The local provider only accepts loopback endpoints (localhost, 127.0.0.1, ::1). Never expose a local runtime to the internet; use an authenticated organisational gateway with HPI_AI_PROVIDER=openai_compatible instead."};
  if(!["http:","https:"].includes(parsed.url.protocol))return {...base,reasonDisabled:"Unsupported URL scheme."};
  const localApi=(env.HPI_AI_LOCAL_API||(runtime==="ollama"?"native":"openai")).trim();
  if(!["native","openai"].includes(localApi)||(localApi==="native"&&runtime!=="ollama"))return {...base,reasonDisabled:"HPI_AI_LOCAL_API must be 'openai', or 'native' with the ollama runtime."};
  return {...base,provider:"local",kind:"local",boundary:"local",available:true,model:model||null,modelSource:model?"configured":"discover_from_runtime",
   localApi,numCtx:int(env.HPI_AI_LOCAL_NUM_CTX,16384,2048,262144),
   runtime,runtimeLabel:LOCAL_RUNTIMES[runtime].label,baseUrl:parsed.baseUrl,baseHost:parsed.host,loopback:true,paidHost:false,reasonDisabled:null};
 }

 if(provider==="openrouter"){
  const dataPolicy=(env.HPI_AI_OPENROUTER_DATA_POLICY||"deny_collection").trim();
  if(!OPENROUTER_DATA_POLICIES[dataPolicy])return {...base,reasonDisabled:"HPI_AI_OPENROUTER_DATA_POLICY must be one of: "+Object.keys(OPENROUTER_DATA_POLICIES).join(", ")+". Policies that allow prompt collection are not offered."};
  if(env.HPI_AI_BASE_URL)return {...base,reasonDisabled:"HPI_AI_BASE_URL must not be set for the openrouter provider; its endpoint is fixed to "+OPENROUTER_BASE_URL+"."};
  const fallbackModels=list(env.HPI_AI_FALLBACK_MODELS);
  if(fallbackModels.some(m=>!MODEL_RE.test(m)))return {...base,reasonDisabled:"HPI_AI_FALLBACK_MODELS contains an invalid model identifier."};
  const warnings=[];
  if((env.HPI_AI_PAID_USE_APPROVAL_REF||"").trim())warnings.push("HPI_AI_PAID_USE_APPROVAL_REF is ignored by the openrouter provider: paid OpenRouter routing is not implemented in this release.");
  const cfg={...base,provider:"openrouter",kind:"openrouter",boundary:"free_cloud",available:apiKeyPresent,model:model||null,
   modelSource:model?"configured":"selection_policy_default",fallbackModels,dataPolicy,freeOnly:true,
   catalogMaxAgeHours:int(env.HPI_AI_CATALOG_MAX_AGE_HOURS,24,1,168),
   baseUrl:OPENROUTER_BASE_URL,baseHost:OPENROUTER_HOST,loopback:false,paidHost:false,warnings,
   reasonDisabled:apiKeyPresent?null:"OpenRouter API key is not configured. Set OPENROUTER_API_KEY (or HPI_AI_API_KEY) in a secure local environment or secret store; never commit it."};
  return cfg;
 }

 // Legacy generic OpenAI-compatible adapter (unchanged behaviour).
 const parsed=parseBaseUrl(env.HPI_AI_BASE_URL);
 if(parsed.error)return {...base,reasonDisabled:parsed.error};
 const {url,host,loopback}=parsed;
 if(!loopback&&url.protocol!=="https:")return {...base,reasonDisabled:"Remote inference endpoints must use HTTPS."};
 if(loopback&&!["http:","https:"].includes(url.protocol))return {...base,reasonDisabled:"Unsupported URL scheme."};
 const allowed=new Set(list(env.HPI_AI_ALLOWED_HOSTS).map(s=>s.toLowerCase()));
 if(!loopback&&!allowed.has(host))return {...base,reasonDisabled:"Remote host "+host+" is not in HPI_AI_ALLOWED_HOSTS."};
 const paid=KNOWN_PAID_HOSTS.some(h=>host===h||host.endsWith("."+h));
 const approval=(env.HPI_AI_PAID_USE_APPROVAL_REF||"").trim();
 if(paid&&!APPROVAL_RE.test(approval))
  return {...base,reasonDisabled:"Host "+host+" is a known paid inference provider; set HPI_AI_PAID_USE_APPROVAL_REF to the GitHub issue recording explicit cost approval."+(host===OPENROUTER_HOST?" For verified free OpenRouter models use HPI_AI_PROVIDER=openrouter instead.":"")};
 if(!model)return {...base,reasonDisabled:"HPI_AI_MODEL is missing or invalid."};
 return {...base,provider:"openai_compatible",kind:"openai_compatible",boundary:loopback?"local":"approved_remote",available:true,model,
  baseUrl:parsed.baseUrl,baseHost:host,loopback,paidHost:paid,paidUseApprovalRef:paid?approval:null,reasonDisabled:null};
}
/** Read the API key for a configuration without storing it in the config object. */
export function readApiKey(config,env={}){
 if(config.kind==="openrouter")return env.OPENROUTER_API_KEY||env.HPI_AI_API_KEY||null;
 return env.HPI_AI_API_KEY||null;
}
/** Public, secret-free description of the configuration. */
export function describeAiConfig(config){
 return {provider:config.provider,kind:config.kind,boundary:config.boundary,available:config.available,model:config.model,host:config.baseHost,
  loopback:config.loopback??null,paidHost:config.paidHost??false,paidUseApprovalRef:config.paidUseApprovalRef,
  freeOnly:config.freeOnly,dataPolicy:config.dataPolicy??null,runtime:config.runtime??null,localApi:config.localApi??null,numCtx:config.numCtx??null,fallbackModels:config.fallbackModels??[],
  apiKeyPresent:config.apiKeyPresent,dataClass:config.dataClass,
  limits:{maxRequests:config.maxRequests,maxInputChars:config.maxInputChars,maxOutputTokens:config.maxOutputTokens,timeoutMs:config.timeoutMs,
   maxRetries:config.maxRetries,dailyRequestCeiling:config.dailyRequestCeiling,minIntervalMs:config.minIntervalMs},
  warnings:config.warnings,reasonDisabled:config.reasonDisabled};
}
