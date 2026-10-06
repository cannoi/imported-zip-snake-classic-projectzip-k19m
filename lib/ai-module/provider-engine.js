/**
 * Provider runner used by Universal AI Module.
 * All secrets stay server-side.
 */
'use strict';
async function postJson(url, body, headers={}) {
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const text=await r.text(); let j={}; try{j=JSON.parse(text)}catch{}
  if(!r.ok) throw new Error(`HTTP ${r.status}: ${String(j.error?.message||j.error||text).slice(0,240)}`);
  return j;
}
function normalizeModel(model, provider){
  if(model && model!=='auto') return model;
  return {
    openai:'gpt-4o-mini', deepseek:'deepseek-chat', openrouter:'openai/gpt-4o-mini',
    groq:'llama-3.3-70b-versatile', mistral:'mistral-small-latest', xai:'grok-3-mini',
    gemini:'gemini-2.0-flash', anthropic:'claude-3-5-haiku-latest', local:'auto', custom:'auto'
  }[provider] || 'auto';
}
async function runProvider({provider,baseUrl,apiKey,model,messages}) {
  const mid=normalizeModel(model,provider);
  if(provider==='gemini'){
    const contents=messages.filter(x=>x.role!=='system').map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:x.content||''}]}));
    const system=messages.find(x=>x.role==='system')?.content;
    const url=`${(baseUrl||'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/,'')}/models/${encodeURIComponent(mid)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const j=await postJson(url,{contents,systemInstruction:system?{parts:[{text:system}]}:undefined,generationConfig:{temperature:.2}});
    return j?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';
  }
  if(provider==='anthropic'){
    const system=messages.find(x=>x.role==='system')?.content||'';
    const msgs=messages.filter(x=>x.role!=='system').map(x=>({role:x.role==='assistant'?'assistant':'user',content:x.content||''}));
    const j=await postJson((baseUrl||'https://api.anthropic.com/v1').replace(/\/$/,'')+'/messages',
      {model:mid,max_tokens:1500,system,messages:msgs},
      {'x-api-key':apiKey,'anthropic-version':'2023-06-01'});
    return j?.content?.map(x=>x.text||'').join('')||'';
  }
  const url=`${(baseUrl||'https://api.openai.com/v1').replace(/\/$/,'')}/chat/completions`;
  const headers=apiKey&&apiKey!=='local'?{Authorization:'Bearer '+apiKey}:{};
  const j=await postJson(url,{model:mid,messages,temperature:.2},headers);
  return j?.choices?.[0]?.message?.content||'';
}
module.exports={runProvider,normalizeModel};
