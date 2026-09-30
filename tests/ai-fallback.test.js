'use strict';
const assert = require('assert');

(async () => {
  const { createAiKernel } = await import('../ai-app-kernel/src/index.js');
  const providers = await import('../ai-app-kernel/src/providers.js');
  const router = await import('../ai-app-kernel/src/router.js');
  const originalFetch = global.fetch;
  const seen = [];
  let calls = 0;
  global.fetch = async (url, options) => {
    calls += 1;
    const body = JSON.parse(options.body);
    seen.push(body.model);
    if (body.model === 'dead-model') {
      return { ok: false, status: 404, async text() { return 'model not found'; } };
    }
    return { ok: true, async text() { return JSON.stringify({ model: body.model, choices: [{ message: { content: 'connected', tool_calls: [] } }] }); } };
  };
  try {
    const k = createAiKernel({ provider: 'local', model: 'dead-model', local: true, baseUrl: 'http://local.test/v1/chat/completions' });
    const out = await k.chat({ message: 'ping' });
    assert.strictEqual(out.text, 'connected');
    assert.strictEqual(seen[0], 'dead-model');
    assert.ok(seen.length >= 2, 'must try a fallback model after selected model fails');
  } finally { global.fetch = originalFetch; }
  assert.ok(router.modelsFor('openai').length >= 2, 'provider should have fallback models');
  assert.ok(typeof providers.completeChat === 'function');

  let discoveryCalls = 0;
  global.fetch = async (url, options) => {
    discoveryCalls += 1;
    if (options.method === 'GET') {
      return { ok: true, async json() { return { models: [{ id: 'live-good-model' }] }; } };
    }
    const body = JSON.parse(options.body);
    if (body.model === 'live-good-model') return { ok: true, async text() { return JSON.stringify({ model: body.model, choices: [{ message: { content: 'discovered', tool_calls: [] } }] }); } };
    return { ok: false, status: 404, async text() { return 'model not found'; } };
  };
  try {
    const k2 = createAiKernel({ provider: 'local', model: 'dead-model', local: true, baseUrl: 'http://local.test/v1/chat/completions', stickyFile: '/tmp/ai-fallback-discovery.json' });
    const out2 = await k2.chat({ message: 'discover' });
    assert.strictEqual(out2.text, 'discovered');
    assert.ok(discoveryCalls > 1, 'must query provider model list after static candidates fail');
  } finally { global.fetch = originalFetch; }
  console.log('AI model fallback/discovery regression: PASS');
})().catch(err => { console.error(err); process.exit(1); });
