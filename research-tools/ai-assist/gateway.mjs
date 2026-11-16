/**
 * HPI-AI research gateway — server-side handler for future hosted inference.
 *
 * STATUS: implemented and tested, NOT deployed. There is no file under api/
 * that routes to it, so the public website exposes no inference endpoint.
 * Activation requires every prerequisite in GATEWAY_PREREQUISITES, recorded in
 * docs/platform/ai-research-assistance-v2.md#public-gateway-activation.
 *
 * Security properties (each covered by tests):
 *  - The OpenRouter key stays server-side; it is never echoed or sent to the
 *    browser. Responses are no-store.
 *  - Callers cannot choose a URL, a model, a prompt or free text: only a task
 *    from an allowlist and 1–3 IDs of PUBLIC knowledge-base sources. This
 *    removes SSRF, arbitrary model selection, prompt-size abuse and the
 *    possibility of submitting personal data.
 *  - Bearer-token authentication against SHA-256 digests (constant-time).
 *  - Per-user per-minute, per-user daily and global daily ceilings enforced in
 *    a DURABLE store with an atomic increment. A store that does not declare
 *    durable:true (for example serverless memory) is refused.
 *  - Results are returned only to the caller and never cached or shared, so
 *    one user's output cannot reach another.
 *  - Free-only routing, circuit breaker and bounded retries are inherited from
 *    the OpenRouter provider; no paid fallback exists.
 */
import {createHash,timingSafeEqual} from "node:crypto";
import {readAiConfig,readApiKey} from "./config.mjs";
import {createOpenRouterProvider,CircuitBreaker} from "./providers.mjs";
import {catalogFreshness} from "./catalog.mjs";
import {selectModels} from "./selection.mjs";
import {runResearchTask} from "./assistant.mjs";
import {QuotaLedger,utcDay} from "./quota.mjs";

export const GATEWAY_TASKS=Object.freeze(["claim-extraction","source-classification","mechanism-tagging"]);
export const GATEWAY_PREREQUISITES=Object.freeze([
 {id:"explicit_enable",description:"HPI_AI_GATEWAY_ENABLED=true set deliberately in the deployment environment"},
 {id:"approval_record",description:"HPI_AI_GATEWAY_APPROVAL_REF points to a GitHub issue recording founder, privacy and legal approval of hosted inference (HPI #103)"},
 {id:"durable_quota_store",description:"A durable quota store with atomic increments (not serverless memory) is configured and approved as a tracked resource"},
 {id:"authentication",description:"HPI_AI_GATEWAY_TOKEN_SHA256 lists SHA-256 digests of issued researcher tokens"},
 {id:"provider_key",description:"An OpenRouter key is stored as a server-side secret (never NEXT_PUBLIC_/VITE_ or in the build)"},
 {id:"fresh_catalogue",description:"A model catalogue verified within the configured maximum age is available to the function"}
]);
const APPROVAL_RE=/^https:\/\/github\.com\/svtmzt\/[a-z0-9-]+\/issues\/\d+$/;
const SHA_RE=/^[0-9a-f]{64}$/;
const sha256=s=>createHash("sha256").update(String(s)).digest("hex");

export function gatewayReadiness(env,{quotaStore,catalog,now=new Date()}={}){
 const config=readAiConfig({...env,HPI_AI_PROVIDER:"openrouter"});
 const tokens=String(env.HPI_AI_GATEWAY_TOKEN_SHA256||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 const checks={
  explicit_enable:env.HPI_AI_GATEWAY_ENABLED==="true",
  approval_record:APPROVAL_RE.test(String(env.HPI_AI_GATEWAY_APPROVAL_REF||"").trim()),
  durable_quota_store:Boolean(quotaStore&&quotaStore.durable===true&&typeof quotaStore.incrementIfBelow==="function"),
  authentication:tokens.length>0&&tokens.every(t=>SHA_RE.test(t)),
  provider_key:config.available===true,
  fresh_catalogue:Boolean(catalog&&catalogFreshness(catalog,{now,maxAgeHours:config.catalogMaxAgeHours||24}).fresh)
 };
 const missing=GATEWAY_PREREQUISITES.filter(p=>!checks[p.id]).map(p=>p.id);
 return {ready:missing.length===0,missing,tokens,config};
}

function send(res,status,body){
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("Cache-Control","no-store");
 return res.status(status).json(body);
}
function authenticate(req,tokens){
 const h=String(req.headers?.authorization||req.headers?.Authorization||"");
 const m=h.match(/^Bearer\s+([A-Za-z0-9._~-]{24,200})$/);
 if(!m)return null;
 const digest=Buffer.from(sha256(m[1]),"hex");
 for(const t of tokens){const b=Buffer.from(t,"hex");if(b.length===digest.length&&timingSafeEqual(b,digest))return t.slice(0,16)}
 return null;
}

/**
 * Create the handler. `publicSources` maps public knowledge-base source IDs to
 * {id,url,text,dataClass}; only those can be analysed.
 */
export function createResearchGateway({env=process.env,quotaStore=null,catalog=null,selectionPolicy=null,publicSources=new Map(),vocab={},
 fetchImpl=globalThis.fetch,now=()=>new Date(),sleep}={}){
 return async function handler(req,res){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return send(res,405,{error:"method_not_allowed"})}
  const ready=gatewayReadiness(env,{quotaStore,catalog,now:now()});
  if(!ready.ready)return send(res,503,{status:"public_inference_disabled",
   message:"Hosted AI research assistance is not enabled. HPI's website works without it; researchers can run the open-source CLI locally.",
   prerequisitesMissing:ready.missing});
  const user=authenticate(req,ready.tokens);
  if(!user)return send(res,401,{error:"authentication_required"});
  const ct=String(req.headers?.["content-type"]||"");
  if(!/^application\/json\b/i.test(ct))return send(res,415,{error:"json_required"});
  const body=typeof req.body==="string"?(()=>{try{return JSON.parse(req.body)}catch{return null}})():req.body;
  if(!body||typeof body!=="object"||Array.isArray(body))return send(res,400,{error:"invalid_json"});
  if(JSON.stringify(body).length>2048)return send(res,413,{error:"request_too_large"});
  const extra=Object.keys(body).filter(k=>!["task","sourceIds"].includes(k));
  if(extra.length)return send(res,400,{error:"unsupported_field",fields:extra.slice(0,5),message:"Only 'task' and 'sourceIds' are accepted; models, URLs and free text cannot be supplied."});
  if(!GATEWAY_TASKS.includes(body.task))return send(res,400,{error:"unsupported_task",allowed:GATEWAY_TASKS});
  const ids=body.sourceIds;
  if(!Array.isArray(ids)||ids.length<1||ids.length>3||ids.some(id=>typeof id!=="string"||!/^E\d{2}$/.test(id)||!publicSources.has(id))||new Set(ids).size!==ids.length)
   return send(res,400,{error:"invalid_source_ids",message:"Provide 1–3 distinct IDs of public HPI evidence-ledger sources."});
  const t=now(),day=utcDay(t),minute=t.toISOString().slice(0,16);
  const limits={userMinute:Number(env.HPI_AI_GATEWAY_USER_PER_MINUTE||2),userDaily:Number(env.HPI_AI_GATEWAY_USER_DAILY||10),globalDaily:Number(env.HPI_AI_GATEWAY_GLOBAL_DAILY||40)};
  for(const [key,limit,scope] of [["gw:user-min:"+user+":"+minute,limits.userMinute,"user_per_minute"],["gw:user-day:"+user+":"+day,limits.userDaily,"user_daily"],["gw:global-day:"+day,limits.globalDaily,"shared_daily"]]){
   const q=await quotaStore.incrementIfBelow(key,limit);
   if(!q.ok)return send(res,429,{status:"quota_exhausted",scope,limit,
    message:scope==="shared_daily"?"The shared free AI capacity for today is used up. It resets at 00:00 UTC. No paid capacity is used as a fallback.":"Your request allowance is used up for this period."});
  }
  const config={...ready.config,maxRequests:ids.length,maxRetries:Math.min(ready.config.maxRetries,1)};
  const models=selectModels(body.task,{catalog,policy:selectionPolicy,config:{...config,model:null,fallbackModels:[]}});
  if(!models.ok)return send(res,503,{status:"model_temporarily_unavailable",message:"No verified free model is currently available for this task. Try again later."});
  const provider=createOpenRouterProvider(config,{fetchImpl,apiKey:readApiKey(config,env),models:models.entries,breaker:new CircuitBreaker(),
   quota:new QuotaLedger({store:quotaStore,dailyCeiling:limits.globalDaily*2,scope:"gw:attempts",now}),sleep});
  const report=await runResearchTask({task:body.task,provider,config,vocab,items:ids.map(id=>({id,sources:[publicSources.get(id)]}))});
  if(report.status==="failed"&&report.failures.some(f=>["quota_exhausted","daily_ceiling_reached"].includes(f.status)))
   return send(res,429,{status:"quota_exhausted",scope:"provider_free_quota",message:"The shared free model quota is exhausted. No paid capacity is used as a fallback."});
  if(report.status==="failed")return send(res,503,{status:"model_temporarily_unavailable",message:"The free model could not complete the request ("+(report.failures[0]?.status||"unknown")+")."});
  return send(res,200,{status:report.status,task:report.task,prompt:report.prompt,
   notice:"AI-generated hypotheses for human review. Not evidence, not a recommendation and not a decision about any person.",
   items:report.queue.map(({provenance,...x})=>({...x,servedModel:provenance?.servedModel??null,upstreamProvider:provenance?.upstreamProvider??null})),
   failures:report.failures.map(f=>({itemId:f.itemId,status:f.status})),quarantined:report.quarantined.map(q=>q.itemId)});
 };
}
