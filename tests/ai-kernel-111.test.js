'use strict';
// Integration test for ai-app-kernel 1.1.1 + ai-bridge.js (no network: fetch is mocked, express is replaced by a tiny fake app).
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), { Writable } = require('stream');
const root = path.resolve(__dirname, '..');
let passed = 0; const ok = (name, cond) => { assert.ok(cond, name); passed++; };

const ENV_KEYS = ['AI_PROVIDER', 'AI_MODEL', 'AI_API_KEY', 'PROVIDER_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'MISTRAL_API_KEY', 'XAI_API_KEY', 'GEMINI_API_KEY', 'AI_ADMIN_PIN', 'AI_STICKY_FILE', 'LOCAL_AI_BASE_URL', 'OLLAMA_BASE_URL', 'LMSTUDIO_BASE_URL', 'AI_BASE_URL', 'DATA_DIR'];
const cleanEnv = () => ENV_KEYS.forEach(k => delete process.env[k]);
function fakeApp() {
  const routes = {}; return { routes, get: (p, h) => { routes['GET ' + p] = h; }, post: (p, h) => { routes['POST ' + p] = h; } };
}
function fakeRes() {
  const chunks = []; const w = new Writable({ write(c, e, cb) { chunks.push(Buffer.from(c)); cb(); } });
  w.code = 200; w.body = null; w.headers = {};
  w.status = c => { w.code = c; return w; }; w.json = b => { w.body = b; w.emit('done'); return w; }; w.setHeader = (k, v) => { w.headers[k] = v; };
  w.bytes = () => Buffer.concat(chunks); return w;
}
async function boot(env = {}) {
  cleanEnv(); Object.assign(process.env, { DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'snake-ai-')) }, env);
  delete require.cache[require.resolve('../ai-bridge.js')];
  const rooms = new Map([['ABCD', { code: 'ABCD', mode: 'coop', mapName: 'open', diff: 'normal', phase: 'playing', level: 1, lives: 3, team: 30, players: new Map([['p1', { id: 'p1', name: 'Ann', score: 30, alive: true }], ['p2', { id: 'p2', name: 'Bob', score: 10, alive: true }]]) }]]);
  const said = []; const app = fakeApp();
  const api = require('../ai-bridge.js').mount(app, { rooms, scores: { coop: 120 }, refSay: (r, t) => said.push(t) });
  await api.ready;
  const call = async (method, p, body = {}, ip = '10.0.0.1') => { const res = fakeRes(); const done = new Promise(r => res.once('done', r)); const h = app.routes[method + ' ' + p]; assert.ok(h, 'route missing ' + method + ' ' + p); await h({ body, ip }, res); if (res.body === null && res.headers['Content-Type']) await new Promise(r => setTimeout(r, 30)); return res; };
  return { app, api, said, call, get: (p) => call('GET', p), post: (p, b, ip) => call('POST', p, b, ip), dir: process.env.DATA_DIR };
}
const realFetch = global.fetch; const sent = [];
function mockFetch(handler) {
  sent.length = 0;
  global.fetch = async (url, opt = {}) => {
    const host = String(url).replace(/^https?:\/\//, '').split('/')[0]; const auth = (opt.headers || {}).Authorization || '';
    const body = opt.body ? JSON.parse(opt.body) : null; sent.push({ host, auth, model: body && body.model, method: opt.method || 'GET' });
    const r = handler({ host, auth, body, url: String(url), method: opt.method || 'GET' });
    return { ok: r.status === undefined, status: r.status || 200, async text() { return r.text || JSON.stringify({ model: (body && body.model) || 'm', choices: [{ message: { content: r.reply || 'pong', tool_calls: [] } }] }); }, async json() { return r.json || {}; } };
  };
}

(async () => {
  // 1. module files (kernel 1.1.1, src intact)
  const kp = JSON.parse(fs.readFileSync(path.join(root, 'ai-app-kernel/package.json'), 'utf8'));
  ok('kernel is 1.1.1', kp.version === '1.1.1');
  for (const f of ['src/index.js', 'src/http.js', 'src/router.js', 'src/providers.js', 'src/brand.js', 'src/tools.js', 'src/store.js', 'src/actions.js', 'src/selftest.js', 'assets/ai-logo.png', 'FIX_REPORT.md', 'INTEGRATE.md']) ok('kernel file ' + f, fs.existsSync(path.join(root, 'ai-app-kernel', f)));

  // 2. kernel.mount() itself: /ai/act used to throw "kernel.invoke is not a function" in 1.1.0
  {
    const mod = await import('../ai-app-kernel/src/index.js'); cleanEnv();
    const actions = mod.createActionRegistry().register({ name: 'ping', description: 'p', parameters: { type: 'object', properties: {} }, run: async () => ({ pong: true }) });
    const app = fakeApp(); mod.createAiKernel({ actions, provider: 'local', local: true, baseUrl: 'http://x/v1/chat/completions', stickyFile: path.join(os.tmpdir(), 'k-' + Date.now() + '.json') }).mount(app, '/ai');
    for (const r of ['GET /ai/health', 'GET /ai/schema', 'GET /ai/capabilities', 'GET /ai/route', 'POST /ai/chat', 'POST /ai/act', 'GET /ai/logo.png']) ok('kernel mounts ' + r, !!app.routes[r]);
    const res = fakeRes(); await app.routes['POST /ai/act']({ body: { name: 'ping' } }, res); ok('kernel /ai/act invokes', res.body && res.body.pong === true);
    const bad = fakeRes(); await app.routes['POST /ai/act']({ body: { name: 'nope' } }, bad); ok('unknown action => 400 JSON', bad.code === 400 && /Unknown action/.test(bad.body.error));
  }

  // 3. bridge, no key: local referee, status shows kernel version, standard routes exist
  {
    const b = await boot();
    const st = (await b.get('/ai/status')).body; ok('status ok', st.ok && st.hasKey === false && st.active === false && st.kernel === '1.1.1');
    ok('health reports version', (await b.get('/ai/health')).body.version === '1.1.1');
    const chat = (await b.post('/ai/chat', { message: 'who leads?', ctx: { code: 'ABCD' } })).body; ok('no key => local referee + needKey', chat.needKey === true && /Ann/.test(chat.text));
    const schema = (await b.get('/ai/schema')).body; ok('schema lists real collections', schema.collections.join() === 'rooms,scores');
    const act = (await b.post('/ai/act', { name: 'list_rooms' })).body; ok('app action works (list_rooms)', act.rooms.length === 1 && act.scores.coop === 120);
    ok('unknown action => 400', (await b.post('/ai/act', { name: 'drop_everything' })).code === 400);
    ok('capabilities list actions', (await b.get('/ai/capabilities')).body.actions.length === 4);
    const logo = await b.get('/ai/logo.png'); const lb = logo.bytes(), isJpeg = lb[0] === 0xff && lb[1] === 0xd8, isPng = lb.slice(1, 4).toString() === 'PNG';
    ok('logo served with the correct image type', lb.length > 1000 && (isJpeg || isPng) && logo.headers['Content-Type'] === (isJpeg ? 'image/jpeg' : 'image/png'));
  }

  try { fs.unlinkSync(path.join(process.cwd(), '.ai-kernel-sticky.json')); } catch (e) {}   // leftover from other tests that build a kernel without stickyFile
  // 4. paste-token-only: gsk_ token is detected as Groq and sent ONLY to Groq
  {
    mockFetch(() => ({ reply: 'groq says hi' })); const b = await boot();
    const saved = (await b.post('/ai/key', { key: 'gsk_TESTTOKEN1234567890' })).body; ok('key saved, never echoed', saved.hasKey === true && !JSON.stringify(saved).includes('gsk_TEST'));
    ok('key file is private (600)', (fs.statSync(path.join(b.dir, 'ai-key.json')).mode & 0o777) === 0o600);
    const out = (await b.post('/ai/chat', { message: 'hello' })).body; ok('reply through detected provider', out.text === 'groq says hi' && out.provider === 'groq');
    ok('request went to Groq with the token', sent.length === 1 && sent[0].host === 'api.groq.com' && sent[0].auth === 'Bearer gsk_TESTTOKEN1234567890');
    const route = (await b.get('/ai/route')).body; ok('/ai/route shows provider/model without secrets', route.provider === 'groq' && !JSON.stringify(route).includes('gsk_') && Array.isArray(route.candidates));
    const st = (await b.get('/ai/status')).body; ok('status: active + provider', st.active && st.provider === 'groq' && !JSON.stringify(st).includes('gsk_'));
    ok('sticky file lives in DATA_DIR, not the app root', fs.existsSync(path.join(b.dir, 'ai-sticky.json')) && !fs.existsSync(path.join(process.cwd(), '.ai-kernel-sticky.json')));
    ok('injected env is removed by clear', process.env.GROQ_API_KEY === 'gsk_TESTTOKEN1234567890');
    await b.post('/ai/key/clear', {}); ok('clear restores env + removes file', process.env.GROQ_API_KEY === undefined && !fs.existsSync(path.join(b.dir, 'ai-key.json')));
    ok('after clear => local referee again', (await b.post('/ai/chat', { message: 'x' })).body.needKey === true);
  }

  // 5. KEY ISOLATION: a rejected OpenAI token must never be sent to another vendor (kernel would forward `apiKey` to every fallback provider)
  {
    mockFetch(({ host }) => host === 'api.openai.com' ? { status: 401, text: 'invalid api key' } : { reply: 'deepseek ok' });
    const b = await boot({ DEEPSEEK_API_KEY: 'sk-ds-OPERATOR-KEY-0000' });
    await b.post('/ai/key', { key: 'sk-USER-OPENAI-KEY-9999999', provider: 'openai' });
    const out = (await b.post('/ai/chat', { message: 'hi' })).body;
    ok('auth failure is reported, not silently rerouted', out.keyError === true && out.kind === 'auth');
    ok('user key never sent to a different vendor', sent.every(s => !s.auth.includes('USER-OPENAI') || s.host === 'api.openai.com'));
    ok('error text is redacted', !JSON.stringify(out).includes('USER-OPENAI-KEY-9999999'));
  }
  // 5b. billing on the user's provider => falls back to the OPERATOR's key for the other provider (its own key, not the user's)
  {
    mockFetch(({ host }) => host === 'api.openai.com' ? { status: 402, text: 'Insufficient Balance' } : { reply: 'deepseek ok' });
    const b = await boot({ DEEPSEEK_API_KEY: 'sk-ds-OPERATOR-KEY-0000' });
    await b.post('/ai/key', { key: 'sk-USER-OPENAI-KEY-9999999', provider: 'openai' });
    const out = (await b.post('/ai/chat', { message: 'hi' })).body;
    ok('billing => provider fallback works', out.text === 'deepseek ok' && out.provider === 'deepseek');
    const ds = sent.filter(s => s.host === 'api.deepseek.com'); ok('fallback used the operator key for that provider', ds.length >= 1 && ds.every(s => s.auth === 'Bearer sk-ds-OPERATOR-KEY-0000'));
    ok('user key only ever went to OpenAI', sent.filter(s => s.auth.includes('USER-OPENAI')).every(s => s.host === 'api.openai.com'));
  }

  // 6. operator env keys named in the docs (OPENAI_API_KEY ...) count as configured
  {
    mockFetch(() => ({ reply: 'env ok' })); const b = await boot({ OPENAI_API_KEY: 'sk-ENV-ONLY-KEY-12345678' });
    const st = (await b.get('/ai/status')).body; ok('env-only key => hasKey/active', st.hasKey === true && st.active === true && st.source === 'env');
    const out = (await b.post('/ai/chat', { message: 'hi' })).body; ok('env-only key answers via kernel', out.text === 'env ok' && sent[0].auth === 'Bearer sk-ENV-ONLY-KEY-12345678');
    ok('status never leaks env key', !JSON.stringify(st).includes('ENV-ONLY'));
    await b.post('/ai/key', { key: 'gsk_UIOVERRIDE123456789' }); await b.post('/ai/key/clear', {});
    ok('clear leaves operator env untouched', process.env.OPENAI_API_KEY === 'sk-ENV-ONLY-KEY-12345678' && (await b.get('/ai/status')).body.hasKey === true);
  }

  // 7. local provider needs no token; admin PIN; bad input; rate limit
  {
    mockFetch(({ host }) => ({ reply: 'local ok' })); const b = await boot({ AI_ADMIN_PIN: '4321' });
    ok('PIN required to set key', (await b.post('/ai/key', { key: 'gsk_TESTTOKEN1234567890' })).code === 403);
    ok('short/space tokens rejected', (await b.post('/ai/key', { key: 'abc', pin: '4321' })).code === 400 && (await b.post('/ai/key', { key: 'has space in it 12345', pin: '4321' })).code === 400);
    ok('unsupported provider rejected', (await b.post('/ai/key', { key: 'gsk_TESTTOKEN1234567890', provider: 'evil', pin: '4321' })).code === 400);
    const st = (await b.post('/ai/key', { provider: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1/chat/completions', key: '', pin: '4321' })).body;
    ok('local provider saved without a token', st.active === true && st.provider === 'ollama');
    const out = (await b.post('/ai/chat', { message: 'hi' })).body; ok('local provider answers, no Authorization header', out.text === 'local ok' && sent[0].host === '127.0.0.1:11434' && sent[0].auth === '');
    let last; for (let i = 0; i < 22; i++) last = await b.post('/ai/chat', { message: 'spam' }, '9.9.9.9'); ok('chat rate limit (20/min/IP)', last.code === 429);
  }

  // 8. typed provider errors surface as kind
  {
    for (const [status, kind, keyErr] of [[402, 'billing', true], [404, 'model', true], [429, 'rate', false]]) {
      mockFetch(() => ({ status, text: 'x' })); const b = await boot({ GEMINI_API_KEY: 'AIzaSyTESTTESTTEST1234567' });
      const out = (await b.post('/ai/chat', { message: 'hi' })).body; ok(`HTTP ${status} => kind ${kind}`, out.kind === kind && out.keyError === keyErr && out.provider === 'local-referee');
    }
  }
  global.fetch = realFetch; cleanEnv();
  console.log(`ai-kernel-111 integration: ${passed}/${passed} passed`);
})().catch(e => { global.fetch = realFetch; console.error(e); process.exit(1); });
