'use strict';
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c]));
}
function flatten(src, prefix, out) {
  if (src == null) return;
  if (typeof src === 'string' || typeof src === 'number') { if (String(src).trim()) out.push([prefix || 'info', String(src)]); return; }
  if (Array.isArray(src)) { src.forEach((v, i) => flatten(v, prefix + ' ' + (i + 1), out)); return; }
  if (typeof src === 'object') Object.keys(src).forEach(k => flatten(src[k], prefix ? prefix + ' · ' + k : k, out));
}
function renderDonate(donate) {
  const box = document.getElementById('fbDonate');
  if (!box) return;
  const rows = [];
  flatten(donate, '', rows);
  if (!rows.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = '<strong>Ủng hộ tác giả</strong>' + rows.slice(0, 12).map(([k, v]) =>
    '<div class="fb-acc"><div class="fb-k">' + escapeHtml(k) + '</div><code class="fb-val">' + escapeHtml(v) + '</code></div>').join('');
}
function setUnread(n) {
  const badge = document.getElementById('aiBadge');
  const tabBadge = document.getElementById('fbTabBadge');
  if (!badge) return;
  if (n > 0) { badge.hidden = false; badge.textContent = n > 9 ? '9+' : String(n); if (tabBadge) { tabBadge.hidden = false; tabBadge.textContent = String(n); } }
  else { badge.hidden = true; if (tabBadge) tabBadge.hidden = true; }
}
function gameContext() {
  let code = '', score = null, mode = '';
  try { if (typeof room !== 'undefined' && room) { code = room.code || ''; mode = room.mode || ''; } } catch (e) {}
  return { screen: document.querySelector('.screen.active') ? document.querySelector('.screen.active').id : 'menu', code, score, mode };
}
function executeActions(actions) {
  (actions || []).forEach(a => {
    if (!a || !a.ok) return;
    if (a.action === 'open_tab') document.querySelector('.tab[data-tab="' + (a.value || 'chat') + '"]')?.click();
    if (a.action === 'show_lan') document.getElementById('s-conn')?.click();
    if (a.action === 'pause_hint') document.getElementById('s-pause')?.click();
  });
}
const aiChat = document.getElementById('aiChat');
const aiInput = document.getElementById('aiInput');
function appendMsg(role, html) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = html;
  aiChat.appendChild(div);
  aiChat.scrollTop = aiChat.scrollHeight;
  return div;
}
const ai = window.UniversalAI.create({ button: document.getElementById('aiFab'), onOpen() {
  document.getElementById('aiOverlay').hidden = false;
  refreshStatus();
  loadSettings();
}, onActions: executeActions });
document.getElementById('aiClose').addEventListener('click', () => { document.getElementById('aiOverlay').hidden = true; });
document.getElementById('aiOverlay').addEventListener('click', e => { if (e.target.id === 'aiOverlay') document.getElementById('aiOverlay').hidden = true; });
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  document.getElementById('tab-' + t.dataset.tab)?.classList.add('active');
  if (t.dataset.tab === 'settings') loadSettings();
  if (t.dataset.tab === 'logs') loadLogs();
  if (t.dataset.tab === 'feedback') { setUnread(0); }
}));
async function refreshStatus() {
  const bar = document.getElementById('aiStatusBar');
  const dot = document.getElementById('aiStatusDot');
  try {
    const j = await ai.status();
    bar.textContent = j.configured ? ('AI ready · ' + j.provider) : 'Local guide ON · add key in Settings';
    if (dot) { dot.classList.toggle('on', !!j.configured); dot.classList.toggle('off', !j.configured); }
  } catch (e) { bar.textContent = 'AI unavailable'; }
}
async function sendAI() {
  const text = (aiInput.value || '').trim();
  if (!text) return;
  aiInput.value = '';
  appendMsg('user', escapeHtml(text));
  const loading = appendMsg('ai', '…');
  try {
    const out = await ai.chat(text, gameContext());
    loading.remove();
    executeActions(out.actions);
    appendMsg('ai', escapeHtml(out.reply || 'Không có phản hồi').replace(/\n/g, '<br>') + (out.source === 'local' || out.configured === false ? '<div style="opacity:.55;font-size:.75rem">Local guide</div>' : ''));
  } catch (e) {
    loading.remove();
    appendMsg('ai', escapeHtml(e.message || 'AI connection failed'));
  }
}
document.getElementById('aiSend').addEventListener('click', sendAI);
aiInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendAI(); } });
async function loadSettings() {
  const sel = document.getElementById('setProvider');
  const status = document.getElementById('setStatus');
  try {
    const [st, cat] = await Promise.all([ai.settings(), ai.catalog()]);
    const providers = (cat.providers && cat.providers.length) ? cat.providers : [];
    if (providers.length) {
      const cur = sel.value;
      sel.innerHTML = '<option value="none">— None —</option>' + providers.map(p => '<option value="' + p.id + '">' + escapeHtml(p.name || p.id) + '</option>').join('');
      sel.value = st.provider || cur || 'none';
    }
    document.getElementById('setApiKey').value = '';
    document.getElementById('setKeyHint').textContent = st.hasKey ? ('Key hiện tại: ' + (st.maskedKey || '****')) : 'Key hiện tại: (chưa có)';
    document.getElementById('setBaseUrl').value = st.baseUrl || '';
    document.getElementById('setModel').value = st.model || 'auto';
    document.getElementById('setMode').value = st.mode || 'cloud_enabled';
    if (status) status.textContent = '';
  } catch (e) { if (status) status.textContent = 'Không tải được settings: ' + e.message; }
}
document.getElementById('setSave').addEventListener('click', async () => {
  const status = document.getElementById('setStatus');
  status.textContent = 'Saving…';
  try {
    const body = { provider: document.getElementById('setProvider').value, baseUrl: document.getElementById('setBaseUrl').value.trim(), model: document.getElementById('setModel').value.trim() || 'auto', mode: document.getElementById('setMode').value };
    const key = document.getElementById('setApiKey').value.trim();
    if (key) body.apiKey = key;
    const j = await ai.saveSettings(body);
    status.textContent = j.ok === false ? (j.error || 'Failed') : 'Saved';
    await loadSettings();
    refreshStatus();
  } catch (e) { status.textContent = e.message; }
});
async function loadLogs() {
  const view = document.getElementById('logsView');
  try {
    const r = await fetch('/api/logs');
    const j = await r.json();
    view.textContent = (j.logs || []).map(l => (l.ts || '') + ' [' + l.level + '] ' + l.msg).join('\n') || '(no logs)';
  } catch (e) { view.textContent = e.message; }
}
document.getElementById('logsRefresh').addEventListener('click', loadLogs);
document.getElementById('logsClear').addEventListener('click', async () => { await fetch('/api/logs', { method: 'DELETE' }); loadLogs(); });
const fb = window.UniversalFeedback.create({ onUnread: setUnread, onSync(sync) { renderDonate(sync.donate); renderNotices(sync.notices); } });
function renderNotices(notices) {
  const el = document.getElementById('fbNotices');
  if (!el) return;
  el.innerHTML = (notices || []).map(n => '<div class="fb-notice"><strong>' + escapeHtml(n.title || 'Notice') + '</strong>' + (n.body ? '<div>' + escapeHtml(n.body) + '</div>' : '') + (n.id ? '<button type="button" data-mark="' + escapeHtml(n.id) + '">Đã đọc</button>' : '') + '</div>').join('');
  el.querySelectorAll('[data-mark]').forEach(btn => btn.addEventListener('click', async () => { await fb.markRead(btn.dataset.mark); btn.closest('.fb-notice')?.remove(); }));
}
let fbRating = 0;
document.querySelectorAll('#fbStars button').forEach(b => b.addEventListener('click', () => {
  fbRating = Number(b.dataset.r);
  document.querySelectorAll('#fbStars button').forEach(x => x.classList.toggle('on', Number(x.dataset.r) <= fbRating));
}));
document.getElementById('fbSubmit').addEventListener('click', async () => {
  const status = document.getElementById('fbStatus');
  const msg = (document.getElementById('fbMessage').value || '').trim();
  if (!msg) { status.textContent = 'Vui lòng nhập nội dung.'; return; }
  status.textContent = 'Sending…';
  try {
    await fb.send({ type: document.getElementById('fbType').value, message: msg, rating: fbRating });
    status.textContent = 'Cảm ơn bạn!';
    document.getElementById('fbMessage').value = '';
  } catch (e) { status.textContent = e.message; }
});
refreshStatus();
loadSettings();
fb.sync().catch(e => { const st = document.getElementById('fbStatus'); if (st) st.textContent = 'Hub: ' + e.message; });
