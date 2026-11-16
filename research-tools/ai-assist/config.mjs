/**
 * AI research-assistance configuration. Disabled by default.
 *
 * Only an OpenAI-compatible chat-completions endpoint is supported (this covers
 * local runtimes such as Ollama, LM Studio, llama.cpp server and LiteLLM).
 * Local loopback hosts are allowed; remote hosts must be HTTPS and explicitly
 * allowlisted. Known paid inference hosts are refused unless a recorded cost
 * approval reference is supplied. The API key value is never returned.
 */
export const KNOWN_PAID_HOSTS=Object.freeze([
 "api.openai.com","api.anthropic.com","openrouter.ai","api.mistral.ai","api.groq.com",
 "generativelanguage.googleapis.com","api.together.xyz","api.fireworks.ai","api.cohere.com","api.deepseek.com"
]);
const LOOPBACK=new Set(["localhost","127.0.0.1","[::1]","::1"]);
const int=(v,fallback,min,max)=>{const n=v===undefined||v===""?fallback:Number(v);if(!Number.isInteger(n)||n<min||n>max)throw new Error("AI config: integer out of range ("+min+"-"+max+"): "+v);return n};

export function readAiConfig(env={}){
 const provider=(env.HPI_AI_PROVIDER||"disabled").trim();
 const base={provider:"disabled",available:false,model:null,baseHost:null,apiKeyPresent:Boolean(env.HPI_AI_API_KEY),
  maxRequests:int(env.HPI_AI_MAX_REQUESTS,20,1,500),maxInputChars:int(env.HPI_AI_MAX_INPUT_CHARS,12000,500,100000),
  maxOutputTokens:int(env.HPI_AI_MAX_OUTPUT_TOKENS,800,64,8000),timeoutMs:int(env.HPI_AI_TIMEOUT_MS,30000,1000,300000),
  paidUseApprovalRef:null,reasonDisabled:"No inference provider configured (HPI_AI_PROVIDER is unset or 'disabled')."};
 if(provider==="disabled")return base;
 if(provider!=="openai_compatible")return {...base,reasonDisabled:"Unsupported provider '"+provider+"'. Only 'openai_compatible' is implemented."};
 let url;
 try{url=new URL(env.HPI_AI_BASE_URL||"")}catch{return {...base,reasonDisabled:"HPI_AI_BASE_URL is missing or invalid."}}
 if(url.username||url.password)return {...base,reasonDisabled:"Credentials must not be embedded in HPI_AI_BASE_URL."};
 const host=url.hostname.toLowerCase();
 const loopback=LOOPBACK.has(host);
 if(!loopback&&url.protocol!=="https:")return {...base,reasonDisabled:"Remote inference endpoints must use HTTPS."};
 if(loopback&&!["http:","https:"].includes(url.protocol))return {...base,reasonDisabled:"Unsupported URL scheme."};
 const allowed=new Set(String(env.HPI_AI_ALLOWED_HOSTS||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean));
 if(!loopback&&!allowed.has(host))return {...base,reasonDisabled:"Remote host "+host+" is not in HPI_AI_ALLOWED_HOSTS."};
 const paid=KNOWN_PAID_HOSTS.some(h=>host===h||host.endsWith("."+h));
 const approval=(env.HPI_AI_PAID_USE_APPROVAL_REF||"").trim();
 if(paid&&!/^https:\/\/github\.com\/svtmzt\/[a-z0-9-]+\/issues\/\d+$/.test(approval))
  return {...base,reasonDisabled:"Host "+host+" is a known paid inference provider; set HPI_AI_PAID_USE_APPROVAL_REF to the GitHub issue recording explicit cost approval."};
 const model=(env.HPI_AI_MODEL||"").trim();
 if(!/^[A-Za-z0-9._:\/-]{1,120}$/.test(model))return {...base,reasonDisabled:"HPI_AI_MODEL is missing or invalid."};
 return {...base,provider:"openai_compatible",available:true,model,baseUrl:url.origin+url.pathname.replace(/\/+$/,""),baseHost:host,
  loopback,paidHost:paid,paidUseApprovalRef:paid?approval:null,reasonDisabled:null};
}
/** Public, secret-free description of the configuration. */
export function describeAiConfig(config){
 return {provider:config.provider,available:config.available,model:config.model,host:config.baseHost,
  loopback:config.loopback??null,paidHost:config.paidHost??false,paidUseApprovalRef:config.paidUseApprovalRef,
  apiKeyPresent:config.apiKeyPresent,limits:{maxRequests:config.maxRequests,maxInputChars:config.maxInputChars,maxOutputTokens:config.maxOutputTokens,timeoutMs:config.timeoutMs},
  reasonDisabled:config.reasonDisabled};
}
