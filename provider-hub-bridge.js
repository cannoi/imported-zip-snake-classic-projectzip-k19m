'use strict';
/**
 * CJS mount for solohost-ai-provider-hub (ESM).
 * Single source of truth for provider connections; mirrors selected key into ai-key.json
 * so the existing chat/kernel path stays one system (no parallel chat stacks).
 */
const fs = require('fs'), path = require('path');
const appLog = require('./app-log');

function dataDir() { return process.env.DATA_DIR || path.join(__dirname, 'data'); }
function keyFile() { return path.join(dataDir(), 'ai-key.json'); }
function settingsFile() { return path.join(dataDir(), 'ai-hub-settings.json'); }

function fileDb() {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch (e) { cache = {}; }
  return {
    setting(k, def) { return cache[k] != null ? cache[k] : def; },
    setSetting(k, v) {
      cache[k] = v;
      try { fs.mkdirSync(dataDir(), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(cache, null, 2), { mode: 0o600 }); } catch (e) {}
      return v;
    }
  };
}

function mirrorKey(provider, apiKey, model, baseUrl) {
  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    const saved = { provider: provider || 'custom', model: model || '', key: apiKey || '', baseUrl: baseUrl || '' };
    fs.writeFileSync(keyFile(), JSON.stringify(saved), { mode: 0o600 });
  } catch (e) { appLog.error('ai-hub', 'mirror key failed', e.message); }
}

async function loadHub() {
  const mod = await import(pathToFileURL(path.join(__dirname, 'solohost-ai-provider-hub', 'index.js')).href);
  const db = fileDb();
  const cfg = { dataDir: dataDir(), ai: {} };
  const hub = new mod.AIProviderHub({ cfg, db, log: { info: (...a) => appLog.info('ai-hub', a.join(' ')), warn: (...a) => appLog.warn('ai-hub', a.join(' ')), error: (...a) => appLog.error('ai-hub', a.join(' ')) } });
  return { hub, mod };
}
function pathToFileURL(p) {
  const { pathToFileURL: ptf } = require('url');
  return ptf(p);
}

function pinOk(req) {
  const pin = process.env.AI_ADMIN_PIN;
  if (!pin) return true;
  const body = req.body || {};
  return String(body.pin || req.get('x-admin-pin') || '') === pin;
}

function mount(app) {
  let hubP = null;
  const getHub = () => { if (!hubP) hubP = loadHub().catch(e => { appLog.error('ai-hub', 'load failed', e.message); hubP = null; throw e; }); return hubP; };

  app.get('/api/ai-hub/state', async (req, res) => {
    try {
      const { hub, mod } = await getHub();
      res.json({ ok: true, ...hub.publicState(), catalog: (mod.PROVIDER_CATALOG || []).map(c => ({ id: c.id, name: c.name, kind: c.kind })) });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e.message || e) });
    }
  });

  app.post('/api/ai-hub/test', async (req, res) => {
    if (!pinOk(req)) return res.status(403).json({ ok: false, error: 'admin pin required' });
    try {
      const { hub } = await getHub();
      const b = req.body || {};
      const provider = String(b.provider || 'custom').trim();
      const apiKey = String(b.apiKey || b.token || b.key || '').trim();
      const baseUrl = String(b.baseUrl || b.local_base_url || '').trim();
      const model = String(b.model || '').trim();
      const result = await hub.testConnection({ provider, apiKey, baseUrl, model: model || undefined });
      if (result && result.ok !== false && apiKey) {
        try {
          hub.upsertConnection({ provider, apiKey, baseUrl, model: result.verifiedModel || model, status: 'VERIFIED', models: (result.models || []).map(id => ({ id, verified: true })) });
          mirrorKey(provider, apiKey, result.verifiedModel || model, baseUrl);
          appLog.info('ai-hub', 'connection verified ' + provider);
        } catch (e) { appLog.warn('ai-hub', 'save after test failed', e.message); }
      }
      res.status(200).json(result && typeof result === 'object' ? result : { ok: !!result, ...result });
    } catch (e) {
      appLog.error('ai-hub', 'test failed', e.message);
      res.status(200).json({ ok: false, warning: String(e.message || e).slice(0, 220) });
    }
  });

  app.post('/api/ai-hub/prefer', async (req, res) => {
    if (!pinOk(req)) return res.status(403).json({ ok: false, error: 'admin pin required' });
    try {
      const { hub } = await getHub();
      const b = req.body || {};
      const st = hub.state();
      if (b.provider) st.preferredProvider = String(b.provider);
      if (b.model != null) st.preferredModel = String(b.model);
      if (b.mode) st.mode = String(b.mode);
      hub.save(st);
      res.json({ ok: true, ...hub.publicState() });
    } catch (e) { res.status(500).json({ ok: false, error: String(e.message || e) }); }
  });

  app.post('/api/ai-hub/remove', async (req, res) => {
    if (!pinOk(req)) return res.status(403).json({ ok: false, error: 'admin pin required' });
    try {
      const { hub } = await getHub();
      const id = String((req.body || {}).id || '');
      if (id && hub.removeConnection) hub.removeConnection(id);
      try { fs.unlinkSync(keyFile()); } catch (e) {}
      appLog.info('ai-hub', 'connection removed ' + id);
      res.json({ ok: true, ...hub.publicState() });
    } catch (e) { res.status(500).json({ ok: false, error: String(e.message || e) }); }
  });

  return { getHub };
}

module.exports = { mount };
