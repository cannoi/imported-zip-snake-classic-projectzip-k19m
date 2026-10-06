/**
 * Mount these routes into the host app's existing HTTP/Express server.
 * Do not create a second web server just for this module.
 */
function mountAIRoutes(router, ai) {
  router.get('/api/ai/status', (_req,res)=>res.json({
    ok:true, configured:ai.configured(), settings:ai.publicSettings()
  }));
  router.get('/api/ai/catalog', (_req,res)=>res.json({providers:ai.catalog()}));
  router.get('/api/ai/settings', (_req,res)=>res.json(ai.publicSettings()));
  router.post('/api/ai/settings', (req,res)=>{
    try { res.json({ok:true,settings:ai.saveSettings(req.body||{})}); }
    catch(e){ ai.log('error','ai.settings',{error:e.message}); res.status(400).json({ok:false,error:e.message}); }
  });
  router.post('/api/ai/chat', async(req,res)=>{
    try {
      const b=req.body||{};
      if(!b.message) return res.status(400).json({ok:false,error:'message required'});
      const out=await ai.chat({message:b.message,history:Array.isArray(b.history)?b.history.slice(-8):[],context:b.context||{},knowledge:b.knowledge,actions:b.actions});
      ai.log('info','ai.chat',{provider:out.provider});
      res.json(out);
    } catch(e){ ai.log('error','ai.chat',{error:e.message}); res.status(500).json({ok:false,error:'AI unavailable'}); }
  });
  router.get('/api/logs',(_req,res)=>res.json({logs:ai.readLogs()}));
  router.delete('/api/logs',(_req,res)=>{ai.clearLogs();res.json({ok:true});});
}
module.exports={mountAIRoutes};
