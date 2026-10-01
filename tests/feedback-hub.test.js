'use strict';
// Feedback Hub integration test: the browser code runs in a fake DOM against a MOCK of the documented SHFH SDK
// (the real shfh-client.js was not provided, so SDK internals are not exercised). Covers loader order, sync, feedback, update, donate, payment, errors.
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert');
const P = path.resolve(__dirname, '../public/'), html = fs.readFileSync(P + '/index.html', 'utf8'), game = fs.readFileSync(P + '/game.js', 'utf8'), fb = fs.readFileSync(P + '/feedback.js', 'utf8');
let n = 0; const ok = (m, c) => { assert.ok(c, m); n++; };
// static
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const used = [...fb.matchAll(/\$\$\('([^']+)'\)/g)].map(m => m[1]); const miss = [...new Set(used)].filter(i => !ids.has(i)); ok('every id used by feedback.js exists in HTML: ' + miss, miss.length === 0);
ok('feedback.js loads after game.js', html.indexOf('src="game.js"') < html.indexOf('src="feedback.js"'));
const keys = [...fb.matchAll(/\b(fb[A-Z]\w*)\b(?=\s*:)/g)].map(m => m[1]); const enKeys = fb.match(/add\('en', \{([\s\S]*?)\}\);/)[1], viKeys = fb.match(/add\('vi', \{([\s\S]*?)\}\);/)[1];
const names = k => [...k.matchAll(/\b(fb\w+):/g)].map(m => m[1]).sort().join(); ok('EN and VI feedback strings have identical keys', names(enKeys) === names(viKeys));
ok('no secrets read by feedback.js', !/localStorage|sessionStorage|apiKey|ai-key|AI_API/.test(fb.replace(/ingestToken/g, '')));

function world({ scripts, sdk, cfg }) {
  const stores = {}, loaded = [], calls = [], fetches = [];
  const any = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : any(), apply: () => undefined, set: () => true });
  const el = id => { if (stores[id]) return stores[id].p; assert(ids.has(id), 'no such id ' + id);
    const st = { cls: new Set(), kids: [], value: '', textContent: '', innerHTML: '', style: {}, attrs: {} };
    const cl = { toggle: (c, on) => { (on === undefined ? !st.cls.has(c) : on) ? st.cls.add(c) : st.cls.delete(c); }, add: c => st.cls.add(c), remove: c => st.cls.delete(c), contains: c => st.cls.has(c) };
    st.p = new Proxy(function () {}, { get: (t, k) => k in st ? st[k] : k === 'classList' ? cl : k === 'getContext' ? (() => any()) : k === 'appendChild' ? (c => { st.kids.push(c); return c; }) : k === 'addEventListener' ? (() => {}) : k === 'getAttribute' ? (a => st.attrs[a] || null) : k === 'focus' || k === 'blur' ? (() => {}) : k === 'children' ? { length: 0 } : any(), set: (t, k, v) => { st[k] = v; if (k === 'innerHTML') st.kids = []; return true; }, apply: () => undefined });
    stores[id] = st; return st.p; };
  const mkEl = () => { const o = { kids: [], style: {}, attrs: {}, cls: new Set(), setAttribute(a, v) { o.attrs[a] = v; }, getAttribute(a) { return o.attrs[a] || null; }, appendChild(c) { o.kids.push(c); return c; }, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {} }; return o; };
  const win = {}; const head = { appendChild(s) { loaded.push(s.src); setTimeout(() => { if (scripts(s.src)) { if (sdk) win.SHFH = sdk(calls); s.onload && s.onload(); } else s.onerror && s.onerror(); }, 0); } };
  const mem = () => { const o = {}; Object.defineProperties(o, { getItem: { value: k => o[k] ?? null }, setItem: { value: (k, v) => { o[k] = String(v); } }, removeItem: { value: k => delete o[k] } }); return o; };
  const sock = { id: 's1', connected: true, on() {}, emit() {} };
  const ctx = { document: { getElementById: el, readyState: 'complete', head, documentElement: any(), body: any(), fullscreenElement: null, addEventListener() {}, createElement: mkEl, querySelectorAll: q => q === '#fb-stars button' ? [1, 2, 3, 4, 5].map(i => { const b = mkEl(); b.attrs['data-n'] = i; return b; }) : [], querySelector: () => null },
    window: win, io: () => sock, localStorage: mem(), sessionStorage: mem(), navigator: { vibrate() {}, wakeLock: { request: () => Promise.resolve() } }, location: { hostname: '192.168.1.9', origin: 'http://192.168.1.9:31877', protocol: 'http:' },
    fetch: async url => { fetches.push(url); if (url === '/api/shfh-config') return { json: async () => cfg }; return { ok: true, json: async () => ({ urls: [], hasKey: false, provider: '', providers: [] }) }; },
    setInterval() {}, setTimeout: (f, ms) => setTimeout(f, Math.min(ms || 0, 20)), clearTimeout, addEventListener() {}, prompt() {}, console, Date, JSON, Math, Set, Promise, Object, Array, String, Number, Error };
  vm.createContext(ctx); win.AudioContext = undefined; ids.forEach(el);   // elements exist from the start, like in a real page
  return { ctx, stores, loaded, calls, fetches, el, win };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mockSdk = (over = {}) => calls => ({ create(opts) { calls.push(['create', opts]); return { async sync() { calls.push(['sync']); if (over.syncFail) throw new Error('offline'); return over.snap || { payment: { state: 'free' }, update: { needed: false }, actions: [], donate: null }; },
  async sendFeedback(p) { calls.push(['sendFeedback', p]); if (over.fbFail) throw new Error('Hub says no'); return { ok: true }; }, async reportPayment(p) { calls.push(['reportPayment', p]); return { ok: true }; }, markUpdateSeen(id) { calls.push(['markUpdateSeen', id]); } }; } });
const pause = fs.readFileSync(P + '/communication-pause.js', 'utf8');
const boot = w => { vm.runInContext(pause, w.ctx); vm.runInContext(game, w.ctx); vm.runInContext(fb, w.ctx); };
const cfgBase = { hubUrl: 'http://14.176.78.46:8090', formUrl: 'http://14.176.78.46:8090/feedback', ingestToken: 'tok123', appId: 'snake-arcade', appName: 'Snake Arcade', version: '2.9.0', platform: 'solohost', enabled: true };

(async () => {
  // 1) default Hub = http://<same host>:8090, SDK from Hub, create() gets documented options, button appears, sync called
  { const w = world({ scripts: s => s === 'http://14.176.78.46:8090/api/sdk.js', sdk: mockSdk(), cfg: cfgBase }); boot(w); await sleep(60);
    ok('SDK requested from the built-in Hub /api/sdk.js', w.loaded[0] === 'http://14.176.78.46:8090/api/sdk.js' && w.loaded.length === 1);
    const c = w.calls.find(x => x[0] === 'create')[1]; ok('create() options per docs', c.hubUrl === 'http://14.176.78.46:8090' && c.ingestToken === 'tok123' && c.appId === 'snake-arcade' && c.appName === 'Snake Arcade' && c.version === '2.9.0' && c.platform === 'solohost' && c.locale === 'en');
    ok('sync() called on open', w.calls.some(x => x[0] === 'sync')); ok('Feedback button visible when Hub is up', w.stores['s-feedback'].style.display === '' && /connected/i.test(w.stores['fb-status'].textContent));
    // send feedback
    w.stores['fb-text'].value = 'snake gets stuck'; w.stores['fb-type'].value = 'bug'; w.stores['s-feedback'].onclick(); ok('modal opens', w.stores['fb-modal'].cls.has('open'));
    await w.stores['fb-send'].onclick(); await sleep(10); const sent = w.calls.find(x => x[0] === 'sendFeedback'); ok('sendFeedback({type,message}) with only user text', sent && sent[1].type === 'bug' && sent[1].message === 'snake gets stuck' && Object.keys(sent[1]).sort().join() === 'message,type');
    ok('success message shown', /sent/i.test(w.stores['fb-msg'].textContent));
    w.stores['fb-text'].value = ''; await w.stores['fb-send'].onclick(); ok('empty message rejected locally, nothing sent', w.calls.filter(x => x[0] === 'sendFeedback').length === 1);
    // rating
    w.stores['fb-text'].value = 'nice'; await w.stores['fb-send'].onclick(); ok('no rating key unless chosen', !('rating' in w.calls.filter(x => x[0] === 'sendFeedback')[1][1])); }
  // 2) Hub down -> falls back to local /shfh-client.js
  { const w = world({ scripts: s => s === '/shfh-client.js', sdk: mockSdk(), cfg: cfgBase }); boot(w); await sleep(80);
    ok('falls back to local /shfh-client.js when Hub unreachable', w.loaded.join() === 'http://14.176.78.46:8090/api/sdk.js,/shfh-client.js'); ok('button visible with local SDK', w.stores['s-feedback'].style.display === ''); }
  // 3) no SDK anywhere -> the button opens the Hub's web form, game unaffected, no exception
  { const w = world({ scripts: () => false, sdk: null, cfg: cfgBase }); let opened = null; w.win.open = (u, t, f) => { opened = [u, t, f]; }; boot(w); await sleep(80);
    ok('no SDK => button visible as web-form fallback', w.stores['s-feedback'].style.display === ''); ok('status explains the fallback', /web form/i.test(w.stores['fb-status'].textContent));
    w.stores['s-feedback'].onclick(); ok('click opens http://14.176.78.46:8090/feedback in a new tab (noopener)', opened && opened[0] === 'http://14.176.78.46:8090/feedback' && opened[1] === '_blank' && opened[2] === 'noopener'); ok('modal not opened without SDK', !w.stores['fb-modal'].cls.has('open')); }
  { const w = world({ scripts: () => false, sdk: null, cfg: { ...cfgBase, enabled: false } }); boot(w); await sleep(60); ok('disabled => button hidden even for the web form', w.stores['s-feedback'].style.display === 'none'); }
  // 4) explicit hubUrl, disabled flag, https page
  { const w = world({ scripts: s => s === 'http://hub.lan:8090/api/sdk.js', sdk: mockSdk(), cfg: { ...cfgBase, hubUrl: 'http://hub.lan:8090' } }); boot(w); await sleep(60); ok('SHFH_HUB_URL overrides default', w.loaded[0] === 'http://hub.lan:8090/api/sdk.js'); }
  { const w = world({ scripts: () => true, sdk: mockSdk(), cfg: { ...cfgBase, enabled: false } }); boot(w); await sleep(40); ok('SHFH_ENABLED=0 => no script loaded at all', w.loaded.length === 0); }
  { const w = world({ scripts: () => true, sdk: mockSdk(), cfg: cfgBase }); w.ctx.location.protocol = 'https:'; boot(w); await sleep(40); ok('https page never loads an http Hub script (mixed content)', !w.loaded.some(s => s.startsWith('http://'))); }
  // 5) update + donate + nudge + payment report
  { const snap = { payment: { state: 'unpaid' }, update: { needed: true, item: { id: 77, version: '3.0.0', title: 'New maps' } }, actions: ['update', 'unpaid_nudge'], donate: { pi: { address: 'GABC123', note: 'Pi wallet' }, mb: { account: '0123456789' }, nested: { deep: { x: 'ignored' } } } };
    const w = world({ scripts: s => /8090/.test(s), sdk: mockSdk({ snap }), cfg: cfgBase }); boot(w); await sleep(60);
    const upd = w.stores['fb-update']; ok('update banner shown', upd.style.display === 'block' && upd.kids.length >= 2); const okBtn = upd.kids.find(k => k.onclick); okBtn.onclick(); ok('markUpdateSeen(item.id) called', w.calls.some(x => x[0] === 'markUpdateSeen' && x[1] === 77)); ok('banner hidden after ack', upd.style.display === 'none');
    const don = w.stores['fb-donate']; const txt = don.kids.map(k => k.textContent).join('|'); ok('donate info rendered as plain text from Hub', don.style.display === 'block' && /GABC123/.test(txt) && /0123456789/.test(txt) && /nudge|support/i.test(txt) === true);
    ok('deeply nested objects are not dumped', !/ignored/.test(txt));
    const payBtn = don.kids.find(k => k.onclick); payBtn.onclick(); ok('payment form opens', w.stores['fb-pay'].style.display === '' && w.stores['fb-form'].style.display === 'none');
    w.stores['fb-txn'].value = 'TX9'; w.stores['fb-method'].value = 'pi'; w.stores['fb-amount'].value = '1'; await w.stores['fb-paysend'].onclick(); await sleep(10);
    const rp = w.calls.find(x => x[0] === 'reportPayment'); ok('reportPayment({txn_id,method,amount})', rp && rp[1].txn_id === 'TX9' && rp[1].method === 'pi' && rp[1].amount === '1'); ok('re-sync after payment', w.calls.filter(x => x[0] === 'sync').length === 2); }
  // 6) errors from the Hub are shown, not swallowed; sync failure keeps feedback available
  { const w = world({ scripts: s => /8090/.test(s), sdk: mockSdk({ fbFail: true, syncFail: true }), cfg: cfgBase }); boot(w); await sleep(60);
    ok('sync failure does not hide feedback (SDK queues offline)', w.stores['s-feedback'].style.display === ''); w.stores['fb-text'].value = 'x'; await w.stores['fb-send'].onclick(); await sleep(10); ok('send error surfaced to the player', /Hub says no/.test(w.stores['fb-msg'].textContent) && w.stores['fb-send'].disabled === false); }
  // 7) locale follows game language
  { const w = world({ scripts: s => /8090/.test(s), sdk: mockSdk(), cfg: cfgBase }); w.ctx.localStorage.snakeLang = 'vi'; boot(w); await sleep(60); ok('locale passed to SDK follows game language (vi)', w.calls.find(x => x[0] === 'create')[1].locale === 'vi'); }
  console.log(`feedback-hub: ${n}/${n} passed (mock SDK - real shfh-client.js not available)`);
})().catch(e => { console.error('FAIL', e.stack.split('\n').slice(0, 5).join('\n')); process.exit(1); });
