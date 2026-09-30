import { createAiKernel, createActionRegistry, createMemoryStore, listProviders } from './index.js';
import { collectAvailableKeys, detectProviderFromToken, pickProvider, modelsFor, createStickyRouter } from './router.js';
import { existsSync } from 'node:fs';
import { logoPath } from './brand.js';
import { aiButtonHtml } from './http.js';

const checks = [];
delete process.env.AI_PROVIDER;
delete process.env.AI_MODEL;
delete process.env.AI_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.GROQ_API_KEY;
delete process.env.OPENROUTER_API_KEY;
delete process.env.XAI_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.DEEPSEEK_API_KEY;
delete process.env.MISTRAL_API_KEY;
delete process.env.OLLAMA_BASE_URL;
delete process.env.LMSTUDIO_BASE_URL;
delete process.env.LOCAL_AI_BASE_URL;
delete process.env.AI_BASE_URL;
function ok(name, cond, extra = '') {
  checks.push({ name, pass: Boolean(cond), extra });
  if (!cond) console.error('FAIL', name, extra);
  else console.log('OK  ', name, extra);
}

ok('logo file', existsSync(logoPath), logoPath);
ok('button html has logo', aiButtonHtml().includes('/ai/logo.png'));
ok('providers include local', listProviders().some((p) => p.id === 'ollama') && listProviders().some((p) => p.id === 'local'));
ok('token groq', detectProviderFromToken('gsk_abc') === 'groq');
ok('token openrouter', detectProviderFromToken('sk-or-v1-x') === 'openrouter');
ok('token xai', detectProviderFromToken('xai-123') === 'xai');
ok('token gemini', detectProviderFromToken('AIzaSyX') === 'gemini');
ok('token openai', detectProviderFromToken('sk-proj-1') === 'openai');
ok('priority xai over openai', pickProvider({ keys: { openai: 'a', xai: 'b' } }) === 'xai');
ok('models exist', modelsFor('openai').length > 0);

const tokenRoute = createAiKernel({ apiKey: 'gsk_auto_route_test', stickyFile: '/tmp/ai-selftest-token-route.json' });
const tokenResolved = await tokenRoute.route();
ok('api key auto-detects provider', tokenResolved.provider === 'groq');
ok('api key auto-selects model', Boolean(tokenResolved.model) && tokenResolved.model !== '');

const localKernel = createAiKernel({ local: true, stickyFile: '/tmp/ai-selftest-local-route.json' });
const localResolved = await localKernel.route();
ok('local route without token', ['ollama', 'lmstudio', 'local'].includes(localResolved.provider));
ok('local route selects model', Boolean(localResolved.model));

const store = createMemoryStore({ notes: [] });
const actions = createActionRegistry().register({
  name: 'ping',
  description: 'ping',
  async run() { return { pong: true }; },
});
const ai = createAiKernel({ schema: { name: 't', collections: [{ name: 'notes' }] }, store, actions });
ok('kernel exports', typeof ai.chat === 'function' && typeof ai.mount === 'function');
ok('invoke action', (await ai.invoke('ping')).pong === true);
ok('schema collections', (await store.listCollections()).includes('notes'));

const mounted = { routes: {} };
['get', 'post'].forEach((m) => {
  mounted[m] = (path, fn) => { mounted.routes[`${m} ${path}`] = fn; };
});
ai.mount(mounted, '/ai');
ok('mount has /ai/act', Boolean(mounted.routes['post /ai/act']));
ok('mount has /ai/health', Boolean(mounted.routes['get /ai/health']));
let actOut = null;
await mounted.routes['post /ai/act'](
  { body: { name: 'ping', args: {} } },
  { json: (x) => { actOut = x; return x; }, status() { return this; } },
);
ok('mounted /ai/act invokes', actOut && actOut.pong === true);

const router = createStickyRouter({ stickyFile: '/tmp/ai-sticky-test.json' });
await router.rememberSuccess('deepseek', 'deepseek-chat');
const snap = await router.snapshot();
ok('sticky remember', snap.provider === 'deepseek' && snap.model === 'deepseek-chat');

const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
