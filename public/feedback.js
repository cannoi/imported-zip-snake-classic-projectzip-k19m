'use strict';
/*
 * SoloHost Feedback Hub integration (optional, loaded after game.js).
 * Uses ONLY the documented SDK surface: SHFH.create({...}) -> hub.sync(), hub.sendFeedback(), hub.reportPayment(), hub.markUpdateSeen().
 * Hub parameters are built into the server (/api/shfh-config), no .env needed. SDK source order: Hub (<hubUrl>/api/sdk.js) -> local copy /shfh-client.js (offline) -> the Hub's web form (<hubUrl>/feedback).
 * Never sends passwords/API keys: only what the player types in the feedback form.
 */
(function () {
  const $$ = id => document.getElementById(id);
  const add = (lg, o) => Object.assign(I18N[lg], o);
  add('en', { fbBtn: 'FEEDBACK', fbTitle: 'SEND FEEDBACK', fbType: 'Type', fbBug: 'Bug', fbIdea: 'Idea', fbOther: 'Other', fbMsg: 'What happened / what would you like?', fbRating: 'Rating', fbWarn: 'Do not write passwords, API keys or seed phrases.', fbSend: 'SEND', fbSent: 'Thank you! Feedback sent ✔', fbFail: 'Could not send', fbEmpty: 'Please write a message', fbHubOff: 'Feedback Hub SDK not reachable - the button opens the web form', fbHubOn: 'Feedback Hub connected', fbUpdate: 'Update available', fbUpdateOk: 'GOT IT', fbDonate: 'Support the author', fbNudge: 'Enjoying the game? You can support the author below.', fbThanks: 'Thanks for your support ❤', fbPaid: 'REPORT PAYMENT', fbTxn: 'Transaction ID', fbMethod: 'Method (e.g. pi)', fbAmount: 'Amount', fbPaySent: 'Payment reported ✔', fbCancel: 'CANCEL' });
  add('vi', { fbBtn: 'GÓP Ý', fbTitle: 'GỬI GÓP Ý', fbType: 'Loại', fbBug: 'Lỗi', fbIdea: 'Ý tưởng', fbOther: 'Khác', fbMsg: 'Có chuyện gì / bạn muốn gì?', fbRating: 'Đánh giá', fbWarn: 'Không viết mật khẩu, API key hay cụm từ khôi phục.', fbSend: 'GỬI', fbSent: 'Cảm ơn bạn! Đã gửi góp ý ✔', fbFail: 'Không gửi được', fbEmpty: 'Hãy nhập nội dung', fbHubOff: 'Không tải được SDK Feedback Hub - nút sẽ mở biểu mẫu web', fbHubOn: 'Đã kết nối Feedback Hub', fbUpdate: 'Có bản cập nhật', fbUpdateOk: 'ĐÃ BIẾT', fbDonate: 'Ủng hộ tác giả', fbNudge: 'Thấy game vui? Bạn có thể ủng hộ tác giả ở bên dưới.', fbThanks: 'Cảm ơn bạn đã ủng hộ ❤', fbPaid: 'BÁO ĐÃ THANH TOÁN', fbTxn: 'Mã giao dịch', fbMethod: 'Phương thức (vd pi)', fbAmount: 'Số tiền', fbPaySent: 'Đã báo thanh toán ✔', fbCancel: 'HỦY' });
  if (typeof applyLang === 'function') applyLang();

  let hub = null, snap = null, state = 'off', rating = 0, cfg = null;
  const loadScript = (src, ms) => new Promise(res => {
    const s = document.createElement('script'); let done = false;
    const fin = ok => { if (!done) { done = true; clearTimeout(tm); res(ok); } }, tm = setTimeout(() => fin(false), ms || 4000);
    s.src = src; s.async = true; s.onload = () => fin(typeof window.SHFH !== 'undefined'); s.onerror = () => fin(false); document.head.appendChild(s);
  });
  async function boot() {
    try { cfg = await fetch('/api/shfh-config').then(r => r.json()); } catch (e) { return; }
    if (!cfg || cfg.enabled === false) return;
    const hubUrl = cfg.hubUrl || '';
    let ok = false;
    if (hubUrl && !(location.protocol === 'https:' && /^http:/i.test(hubUrl))) ok = await loadScript(hubUrl + '/api/sdk.js');   // an https page cannot call an http Hub (mixed content)
    if (!ok) ok = await loadScript('/shfh-client.js', 2500);
    if (!ok) { state = 'off'; refreshUi(); return; }
    try {
      hub = window.SHFH.create({ hubUrl, ingestToken: cfg.ingestToken || '', appId: cfg.appId, appName: cfg.appName, version: cfg.version, platform: cfg.platform || 'solohost', locale: lang });
      state = 'on'; snap = await hub.sync();
    } catch (e) { state = hub ? 'on' : 'off'; snap = null; }
    refreshUi(); applySnapshot();
  }
  const text = v => String(v == null ? '' : v).slice(0, 200);
  function applySnapshot() {
    if (!snap) return;
    const acts = Array.isArray(snap.actions) ? snap.actions : [];
    if (snap.update && snap.update.needed) {
      const it = snap.update.item || {}, box = $$('fb-update'); if (box) {
        box.style.display = 'block'; box.innerHTML = ''; const b = document.createElement('b'); b.textContent = t('fbUpdate') + (it.version ? ' · ' + text(it.version) : ''); box.appendChild(b);
        const msg = it.title || it.message || it.notes; if (msg) { const p = document.createElement('div'); p.textContent = text(msg); box.appendChild(p); }
        const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn-secondary'; ok.textContent = t('fbUpdateOk');
        ok.onclick = () => { try { if (it.id != null) hub.markUpdateSeen(it.id); } catch (e) {} box.style.display = 'none'; }; box.appendChild(ok);
      }
    }
    if (acts.includes('payment_ok') || acts.includes('thanks')) toast(t('fbThanks'));
    renderDonate(acts.includes('unpaid_nudge'));
  }
  function renderDonate(nudge) {                           // Pi / MB Bank info comes from the Hub; shape is not fixed, so only flat text values are shown
    const box = $$('fb-donate'); if (!box) return; box.innerHTML = '';
    const d = snap && snap.donate, rows = [];
    if (d && typeof d === 'object') for (const k of Object.keys(d)) { const v = d[k]; if (typeof v === 'string' || typeof v === 'number') rows.push([k, text(v)]); else if (v && typeof v === 'object') for (const k2 of Object.keys(v)) if (typeof v[k2] === 'string' || typeof v[k2] === 'number') rows.push([k + ' · ' + k2, text(v[k2])]); }
    const pay = snap && snap.payment && snap.payment.state;
    if (!rows.length && !nudge) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    const h = document.createElement('b'); h.textContent = t('fbDonate'); box.appendChild(h);
    if (nudge) { const p = document.createElement('div'); p.className = 'small'; p.textContent = t('fbNudge'); box.appendChild(p); }
    rows.slice(0, 8).forEach(([k, v]) => {
      const row = document.createElement('div'); row.className = 'fb-row';
      const lab = document.createElement('span'); lab.className = 'fb-k'; lab.textContent = k;
      const val = document.createElement('code'); val.className = 'fb-val'; val.textContent = v; val.title = v;
      row.appendChild(lab); row.appendChild(val);
      const acc = /\d{6,}/.test(String(v).replace(/\s/g,'')) || String(v).length >= 8;
      if (acc) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-secondary fb-copy'; b.textContent = 'COPY';
        b.onclick = () => { if (typeof copyText === 'function') copyText(String(v)); else { try { navigator.clipboard.writeText(String(v)); } catch (e) {} } };
        row.appendChild(b);
      }
      box.appendChild(row);
    });
    if (rows.length && pay !== 'free' && pay !== 'waived') { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-secondary'; b.textContent = t('fbPaid'); b.onclick = () => openModal(true); box.appendChild(b); }
  }
  function refreshUi() {
    const b = $$('s-feedback'), s = $$('fb-status'); if (!b) return;
    b.style.display = (state === 'on' || (cfg && cfg.formUrl && cfg.enabled !== false)) ? '' : 'none';   // no SDK: the button opens the Hub web form instead
    if (s) s.textContent = state === 'on' ? t('fbHubOn') : t('fbHubOff');
  }
  // ---- modal ----
  const modal = () => $$('fb-modal');
  function openModal(pay) {
    $$('fb-form').style.display = pay ? 'none' : ''; $$('fb-pay').style.display = pay ? '' : 'none'; $$('fb-msg').textContent = '';
    modal().classList.add('open'); if (typeof communicationPause !== 'undefined') communicationPause.open('feedback'); setTimeout(() => ($$(pay ? 'fb-txn' : 'fb-text')).focus(), 50);
  }
  function closeModal() { modal().classList.remove('open'); if (typeof communicationPause !== 'undefined') communicationPause.close('feedback'); }
  function setRating(n) { rating = n; document.querySelectorAll('#fb-stars button').forEach(b => b.classList.toggle('on', +b.getAttribute('data-n') <= n)); }
  async function send() {
    const message = $$('fb-text').value.trim(); if (!message) { $$('fb-msg').textContent = t('fbEmpty'); return; }
    const payload = { type: $$('fb-type').value, message: message.slice(0, 1000) }; if (rating) payload.rating = rating;
    $$('fb-send').disabled = true;
    try { await hub.sendFeedback(payload); $$('fb-text').value = ''; setRating(0); $$('fb-msg').textContent = t('fbSent'); toast(t('fbSent')); setTimeout(closeModal, 900); }
    catch (e) { $$('fb-msg').textContent = t('fbFail') + (e && e.message ? ': ' + String(e.message).slice(0, 120) : ''); }
    $$('fb-send').disabled = false;
  }
  async function pay() {
    const txn_id = $$('fb-txn').value.trim(), method = $$('fb-method').value.trim(), amount = $$('fb-amount').value.trim();
    if (!txn_id) { $$('fb-msg').textContent = t('fbEmpty'); return; }
    try { await hub.reportPayment({ txn_id, method, amount }); $$('fb-msg').textContent = t('fbPaySent'); try { snap = await hub.sync(); } catch (e) {} setTimeout(() => { closeModal(); applySnapshot(); }, 900); }
    catch (e) { $$('fb-msg').textContent = t('fbFail') + (e && e.message ? ': ' + String(e.message).slice(0, 120) : ''); }
  }
  $$('s-feedback').onclick = () => { if (state === 'on') openModal(false); else if (cfg && cfg.formUrl) window.open(cfg.formUrl, '_blank', 'noopener'); };
  $$('fb-send').onclick = send; $$('fb-paysend').onclick = pay; $$('fb-cancel').onclick = $$('fb-paycancel').onclick = closeModal;
  document.querySelectorAll('#fb-stars button').forEach(b => { b.onclick = () => setRating(+b.getAttribute('data-n') === rating ? 0 : +b.getAttribute('data-n')); });
  modal().addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeModal(); } });
  modal().addEventListener('click', e => { if (e.target === modal()) closeModal(); });
  const prevSetLang = window.setLang; if (typeof prevSetLang === 'function') window.setLang = function (l) { prevSetLang(l); refreshUi(); };
  refreshUi(); boot();
})();
