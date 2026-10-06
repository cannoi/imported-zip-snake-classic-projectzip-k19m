'use strict';
/**
 * CJS mount for @solohost/ai-provider-hub (ESM).
 * - Saves keys through the same ai-key.json the chat kernel reads (one system).
 * - testConnection never crashes the HTTP handler; auth failures become { ok:false, warning }.
 * - provider "auto" is resolved from token prefix / catalog before calling the hub.
 */
const fs = require('fs'), path = require('path');
const { pathToFileURL } = require('url');
const appLog = require('./app-log');

const CATALOG_IDS = ['openai', 'gemini', 'deepseek', 'anthropic', 'openrouter', 'groq', 'mistral', 'xai', 'custom'];

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
      try {
        fs.mkdirSync(dataDir(), { recursive: true });
        fs.writeFileSync(settingsFile(), JSON.stringify(cache, null, 2), { mode: 0o600 });
      } catch (e) {}
      return v;
    }
  };
}

function writeKeyFile(provider, apiKey, model, baseUrl) {
  const saved = {
    provider: String(provider || 'custom').toLowerCase(),
    model: String(model || ''),
    key: String(apiKey || ''),
    baseUrl: String(baseUrl || '')
  };
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(keyFile(), JSON.stringify(saved), { mode: 0o600 });
  return saved;
}

function detectProvider(token, explicit) {
  const exp = String(explicit || '').trim().toLowerCase();
  if (exp && exp !== 'auto' && CATALOG_IDS.includes(exp)) return exp;
  const t = String(token || '').trim();
  if (/^gsk_/i.test(t)) return 'groq';
  if (/^sk-or-/i.test(t)) return 'openrouter';
  if (/^xai-/i.test(t)) return 'xai';
  if (/^AIza/i.test(t)) return 'gemini';
  if (/^sk-ant-/i.test(t)) return 'anthropic';
  // bare sk- is ambiguous (OpenAI / DeepSeek) — keep explicit choice if user set deepseek
  if (/^sk-/i.test(t)) return exp === 'deepseek' ? 'deepseek' : (exp && exp !== 'auto' ? exp : 'openai');
  if (exp === 'custom' || exp === 'ollama' || exp === 'lmstudio' || exp === 'local') return exp === 'auto' ? 'custom' : exp;
  return exp && exp !== 'auto' ? exp : 'custom';
}

function normalizeModels(list) {
  if (!Array.isArray(list)) return [];
  return list.map(m => {
    if (typeof m === 'string') return { id: m, verified: false };
    if (m && typeof m === 'object') return { id: String(m.id || m.name || ''), verified: !!m.verified, displayName: m.displayName || m.id };
    return null;
  }).filter(m => m && m.id);
}

function pinOk(req) {
  const pin = process.env.AI_ADMIN_PIN;
  if (!pin) return true;
  const body = req.body || {};
  return String(body.pin || req.get('x-admin-pin') || '') === pin;
}

async function loadHub() {
  const mod = await import(pathToFileURL(path.join(__dirname, 'solohost-ai-provider-hub', 'index.js')).href);
  const db = fileDb();
  const cfg = { dataDir: dataDir(), ai: {} };
  const log = {
    info: (...a) => appLog.info('ai-hub', a.map(String).join(' ')),
    warn: (...a) => appLog.warn('ai-hub', a.map(String).join(' ')),
    error: (...a) => appLog.error('ai-hub', a.map(String).join(' '))
  };
  const hub = new mod.AIProviderHub({ cfg, db, log });
  return { hub, mod };
}

function mount(app, opts = {}) {
  let hubP = null;
  const onKeySaved = typeof opts.onKeySaved === 'function' ? opts.onKeySaved : null;

  const getHub = () => {
    if (!hubP) {
      hubP = loadHub().catch(e => {
        appLog.error('ai-hub', 'load failed', e.message);
        hubP = null;
        throw e;
      });
    }
    return hubP;
  };

  app.get('/api/ai-hub/state', async (req, res) => {
    try {
      const { hub, mod } = await getHub();
      const catalog = (mod.PROVIDER_CATALOG || []).map(c => ({ id: c.id, name: c.name, kind: c.kind }));
      res.json({ ok: true, ...hub.publicState(), catalog });
    } catch (e) {
      res.status(200).json({
        ok: false,
        error: String(e.message || e),
        catalog: CATALOG_IDS.map(id => ({ id, name: id, kind: 'openai' }))
      });
    }
  });

  // Save key WITHOUT requiring a live provider call (SoloHost offline / bad network still works).
  app.post('/api/ai-hub/save', async (req, res) => {
    if (!pinOk(req)) return res.status(403).json({ ok: false, error: 'admin pin required' });
    try {
      const b = req.body || {};
      const apiKey = String(b.apiKey || b.token || b.key || '').trim();
      const baseUrl = String(b.baseUrl || b.local_base_url || '').trim();
      const model = String(b.model || '').trim();
      let provider = detectProvider(apiKey, b.provider);
      if (!apiKey && !['custom', 'ollama', 'lmstudio', 'local'].includes(provider)) {
        return res.status(200).json({ ok: false, warning: 'Token is empty.' });
      }
      if (apiKey && (apiKey.length < 8 || apiKey.length > 500)) {
        return res.status(200).json({ ok: false, warning: 'Token length looks invalid (8–500 chars).' });
      }
      const saved = writeKeyFile(provider, apiKey, model, baseUrl);
      try {
        const { hub } = await getHub();
        if (apiKey) {
          hub.upsertConnection({
            provider,
            apiKey,
            baseUrl,
            model,
            status: 'UNVERIFIED',
            models: model ? [{ id: model, verified: false }] : []
          });
        }
      } catch (e) {
        appLog.warn('ai-hub', 'upsert after save failed', e.message);
      }
      if (onKeySaved) onKeySaved(saved);
      appLog.info('ai-hub', 'key saved provider=' + provider);
      res.status(200).json({ ok: true, saved: true, provider, model, hasKey: !!apiKey });
    } catch (e) {
      appLog.error('ai-hub', 'save failed', e.message);
      res.status(200).json({ ok: false, warning: String(e.message || e).slice(0, 220) });
    }
  });

  app.post('/api/ai-hub/test', async (req, res) => {
    if (!pinOk(req)) return res.status(403).json({ ok: false, error: 'admin pin required' });
    const b = req.body || {};
    const apiKey = String(b.apiKey || b.token || b.key || '').trim();
    const baseUrl = String(b.baseUrl || b.local_base_url || '').trim();
    const model = String(b.model || '').trim();
    let provider = detectProvider(apiKey, b.provider);

    if (!apiKey && !baseUrl && provider !== 'custom') {
      return res.status(200).json({ ok: false, kind: 'auth', warning: 'Enter an API token first.', provider });
    }

    try {
      const { hub } = await getHub();
      let result;
      try {
        result = await hub.testConnection({
          provider: provider === 'ollama' || provider === 'lmstudio' || provider === 'local' ? 'custom' : provider,
          apiKey: apiKey || 'local',
          baseUrl,
          model: model || undefined
        });
      } catch (err) {
        const cls = err && err.classify;
        const msg = (cls && cls.user) || String(err.message || err);
        const status = err && err.status;
        const kind = (cls && cls.code === 'INVALID_CREDENTIAL') ? 'auth'
          : (status === 402 ? 'billing' : (status === 429 ? 'rate' : (/timeout|abort/i.test(msg) ? 'timeout' : 'other')));
        appLog.warn('ai-hub', 'testConnection error ' + provider, msg.slice(0, 160));
        return res.status(200).json({
          ok: false,
          verified: false,
          provider,
          models: [],
          kind,
          warning: msg.slice(0, 240),
          suggested_provider: null
        });
      }

      const models = normalizeModels(result && result.models);
      const verifiedModel = result && (result.verifiedModel || (models[0] && models[0].id) || model);
      const ok = !!(result && result.ok !== false);

      if (ok && apiKey) {
        try {
          hub.upsertConnection({
            provider,
            apiKey,
            baseUrl,
            model: verifiedModel,
            status: 'VERIFIED',
            models: models.length ? models : (verifiedModel ? [{ id: verifiedModel, verified: true }] : [])
          });
          const saved = writeKeyFile(provider, apiKey, verifiedModel || model, baseUrl);
          if (onKeySaved) onKeySaved(saved);
          appLog.info('ai-hub', 'verified ' + provider + ' model=' + (verifiedModel || ''));
        } catch (e) {
          appLog.warn('ai-hub', 'persist after test failed', e.message);
        }
      }

      res.status(200).json({
        ok,
        verified: ok,
        provider,
        models,
        verifiedModel: verifiedModel || '',
        kind: ok ? 'ok' : 'other',
        warning: (result && result.warning) || (ok ? '' : 'Verification failed'),
        hint: (result && result.hint) || ''
      });
    } catch (e) {
      appLog.error('ai-hub', 'test handler failed', e.message);
      res.status(200).json({ ok: false, kind: 'other', provider, warning: String(e.message || e).slice(0, 220) });
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
    } catch (e) {
      res.status(200).json({ ok: false, error: String(e.message || e) });
    }
  });

  app.post('/api/ai-hub/remove', async (req, res) => {
    if (!pinOk(req)) return res.status(403).json({ ok: false, error: 'admin pin required' });
    try {
      const { hub } = await getHub();
      const id = String((req.body || {}).id || '');
      if (id && hub.removeConnection) hub.removeConnection(id);
      try { fs.unlinkSync(keyFile()); } catch (e) {}
      if (onKeySaved) onKeySaved(null);
      appLog.info('ai-hub', 'connection removed');
      res.json({ ok: true, ...hub.publicState() });
    } catch (e) {
      try { fs.unlinkSync(keyFile()); } catch (e2) {}
      if (onKeySaved) onKeySaved(null);
      res.status(200).json({ ok: true, cleared: true });
    }
  });

  return { getHub };
}

module.exports = { mount, detectProvider, writeKeyFile };
