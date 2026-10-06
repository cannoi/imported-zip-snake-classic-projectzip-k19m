'use strict';
const { chat, status: aiStatus, catalogPublic } = require('./ai-gateway');
const store = require('./settings-store');

const SHFH = {
  hubId: 'SHFH-CANNOI-0905428801',
  hubUrl: 'http://14.176.78.46:8090',
  ingestToken: 'cannoi_7Kp9xV2mQ8rN4tY6cL3wA5zD1eF0uH9',
  appId: 'snake-arcade',
  appName: 'Snake Arcade',
};

function mount(app) {
  app.get('/api/shfh-config', (req, res) => {
    const hubUrl = String(process.env.SHFH_HUB_URL || SHFH.hubUrl).replace(/\/+$/, '');
    res.json({
      hubId: process.env.SHFH_HUB_ID || SHFH.hubId,
      hubUrl,
      formUrl: hubUrl + '/feedback',
      ingestToken: process.env.SHFH_INGEST_TOKEN != null ? process.env.SHFH_INGEST_TOKEN : SHFH.ingestToken,
      appId: process.env.SHFH_APP_ID || SHFH.appId,
      appName: process.env.SHFH_APP_NAME || SHFH.appName,
      version: process.env.SHFH_APP_VERSION || '3.1.0',
      platform: 'solohost',
      enabled: process.env.SHFH_ENABLED !== '0',
    });
  });

  app.post('/api/shfh-proxy/feedback', async (req, res) => {
    try {
      const hubUrl = String(process.env.SHFH_HUB_URL || SHFH.hubUrl).replace(/\/+$/, '');
      const token = process.env.SHFH_INGEST_TOKEN || SHFH.ingestToken;
      const r = await fetch(hubUrl + '/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(req.body || {}),
      });
      const text = await r.text();
      let j; try { j = JSON.parse(text); } catch (e) { j = { raw: text.slice(0, 300) }; }
      store.appendLog(r.ok ? 'info' : 'warn', 'shfh.proxy', { status: r.status });
      res.status(r.status).json(j);
    } catch (e) {
      store.appendLog('error', 'shfh.proxy', { error: e.message });
      res.status(502).json({ ok: false, error: e.message });
    }
  });

  app.get('/api/ai/status', (req, res) => res.json(aiStatus()));
  app.get('/api/ai/catalog', (req, res) => res.json({ providers: catalogPublic() }));
  app.get('/api/ai/settings', (req, res) => res.json(store.publicSettings()));
  app.post('/api/ai/settings', (req, res) => {
    try {
      const pub = store.writeSettings(req.body || {});
      store.appendLog('info', 'settings.saved', { provider: pub.provider, hasKey: pub.hasKey });
      res.json({ ok: true, settings: pub, status: aiStatus() });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const body = req.body || {};
      if (!body.message || typeof body.message !== 'string') return res.status(400).json({ ok: false, error: 'message required' });
      const out = await chat({
        message: body.message.slice(0, 2000),
        context: body.context || {},
        history: Array.isArray(body.history) ? body.history.slice(-8) : [],
      });
      res.json(out);
    } catch (e) {
      store.appendLog('error', 'ai.chat', { error: e.message });
      res.status(500).json({ ok: false, error: 'AI unavailable', detail: e.message });
    }
  });
  app.get('/api/logs', (req, res) => {
    const limit = Math.min(200, parseInt(req.query.limit || '80', 10) || 80);
    res.json({ logs: store.readLogs(limit) });
  });
  app.delete('/api/logs', (req, res) => { store.clearLogs(); res.json({ ok: true }); });
}

module.exports = { mount, SHFH };
