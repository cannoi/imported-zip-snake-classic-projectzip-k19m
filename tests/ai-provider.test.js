'use strict';
const assert = require('assert');

(async () => {
  const { completeChat, listProviders } = await import('../ai-app-kernel/src/providers.js');
  assert.deepStrictEqual(
    listProviders().filter(p => p.local).map(p => p.id).sort(),
    ['lmstudio', 'local', 'ollama'].sort()
  );

  const originalFetch = global.fetch;
  let seen = null;
  global.fetch = async (url, options) => {
    seen = { url, options };
    return {
      ok: true,
      async text() { return JSON.stringify({ model: 'llama3.1', choices: [{ message: { content: 'local-ok', tool_calls: [] } }] }); }
    };
  };
  try {
    const out = await completeChat({ provider: 'ollama', messages: [{ role: 'user', content: 'ping' }] });
    assert.strictEqual(out.text, 'local-ok');
    assert.strictEqual(out.provider, 'ollama');
    assert.ok(seen.url.includes('11434/v1/chat/completions'));
    assert.ok(!('Authorization' in seen.options.headers), 'local provider must not require an API key');
  } finally {
    global.fetch = originalFetch;
  }
  console.log('AI provider/local checks: 5/5 passed');
})().catch(err => { console.error(err); process.exit(1); });
