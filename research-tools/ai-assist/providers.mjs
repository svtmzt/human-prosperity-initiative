/**
 * Inference provider adapters and request budget. The disabled provider never
 * performs network access. The OpenAI-compatible adapter maps every failure to
 * an explicit non-success status; it never fabricates a response.
 */
export class RequestBudget{
 constructor({maxRequests,maxInputChars}){this.maxRequests=maxRequests;this.maxInputChars=maxInputChars;this.requests=0;this.inputChars=0}
 /** Reserve capacity for one request; returns false (and reserves nothing) when a ceiling would be exceeded. */
 reserve(inputChars){
  if(this.requests+1>this.maxRequests||this.inputChars+inputChars>this.maxInputChars)return false;
  this.requests++;this.inputChars+=inputChars;return true;
 }
 snapshot(){return {requestsUsed:this.requests,maxRequests:this.maxRequests,inputCharsUsed:this.inputChars,maxInputChars:this.maxInputChars}}
}
export function createDisabledProvider(reason="No inference provider configured."){
 return {id:"disabled",available:false,
  async complete(){return {ok:false,status:"disabled",reason}}};
}
export function createOpenAiCompatibleProvider(config,{fetchImpl=globalThis.fetch,apiKey}={}){
 if(!config?.available||config.provider!=="openai_compatible")return createDisabledProvider(config?.reasonDisabled||"Provider not available.");
 return {id:"openai_compatible",available:true,model:config.model,
  async complete(messages,{maxTokens=config.maxOutputTokens}={}){
   let response;
   try{
    response=await fetchImpl(config.baseUrl+"/v1/chat/completions",{
     method:"POST",redirect:"error",signal:AbortSignal.timeout(config.timeoutMs),
     headers:{"content-type":"application/json",...(apiKey?{authorization:"Bearer "+apiKey}:{})},
     body:JSON.stringify({model:config.model,messages,temperature:0,max_tokens:maxTokens,response_format:{type:"json_object"}})
    });
   }catch(error){return {ok:false,status:error?.name==="TimeoutError"?"timeout":"unavailable",reason:"Inference request failed: "+(error?.message||"network error")}}
   if(response.status===429)return {ok:false,status:"rate_limited",reason:"Provider rate limit (HTTP 429)."};
   if(!response.ok)return {ok:false,status:"http_error",reason:"Provider returned HTTP "+response.status};
   let data;
   try{data=await response.json()}catch{return {ok:false,status:"malformed_response",reason:"Provider response is not JSON."}}
   const content=data?.choices?.[0]?.message?.content;
   if(typeof content!=="string"||!content.trim())return {ok:false,status:"malformed_response",reason:"Provider response has no message content."};
   return {ok:true,status:"completed",content,usage:data.usage??null,model:data.model??config.model};
  }};
}
