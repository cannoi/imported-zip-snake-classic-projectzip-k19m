'use strict';
// Token check / model list (kernel 1.1.3). No live provider key required.
const assert = require('assert');
const path = require('path');
let n = 0;
const ok = (m, c) => { assert.ok(c, m); n++; console.log('ok', m); };

(async () => {
  const router = await import(path.join(__dirname, '../ai-app-kernel/src/router.js'));
  const providers = await import(path.join(__dirname, '../ai-app-kernel/src/providers.js'));
  ok('gemini hint', router.detectProviderFromToken('AIzaSyEXAMPLEKEY123456') === 'gemini');
  ok('groq hint', router.detectProviderFromToken('gsk_abc123456789') === 'groq');
  ok('openrouter hint', router.detectProviderFromToken('sk-or-v1-abc') === 'openrouter');
  ok('xai hint', router.detectProviderFromToken('xai-abc123456') === 'xai');
  ok('bare sk- is openai hint not strong mismatch class alone', router.detectProviderFromToken('sk-abc123456789') === 'openai');
  ok('parse openai data[]', router.parseModelList('deepseek', { data: [{ id: 'deepseek-chat' }, { id: 'deepseek-reasoner' }] }).includes('deepseek-chat'));
  ok('parse gemini models/ name', router.parseModelList('gemini', { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }).includes('gemini-2.5-flash'));

  const mismatch = router.detectProviderFromToken('AIzaSyEXAMPLEKEY123456');
  ok('gemini key while deepseek selected suggests gemini', mismatch === 'gemini' && mismatch !== 'deepseek');

  const fetch401 = async () => ({ ok: false, status: 401, text: async () => 'unauthorized' });
  const bad = await providers.verifyProvider({ provider: 'deepseek', apiKey: 'sk-wrong', fetchImpl: fetch401, chat: async () => { throw new Error('HTTP 401 unauthorized'); } });
  ok('wrong key ok:false', bad.ok === false);
  ok('wrong key mentions 401', /401/.test(bad.warning));

  const fetchNet = async () => { throw new Error('getaddrinfo ENOTFOUND'); };
  const net = await providers.verifyProvider({ provider: 'deepseek', apiKey: 'sk-abc123456789', fetchImpl: fetchNet, chat: async () => { throw new Error('getaddrinfo ENOTFOUND'); } });
  ok('unreachable is network not token invalid', net.ok === false && (net.kind === 'network' || net.kind === 'timeout'));
  ok('unreachable warning is not only token invalid', !/^token invalid$/i.test(net.warning));

  const fetchOk = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ data: [{ id: 'deepseek-chat' }, { id: 'deepseek-reasoner' }] }) });
  const good = await providers.verifyProvider({ provider: 'deepseek', apiKey: 'sk-live', fetchImpl: fetchOk });
  ok('valid key ok + models', good.ok === true && good.models.includes('deepseek-chat'));
  console.log('ai-discovery: ' + n + '/' + n + ' passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
