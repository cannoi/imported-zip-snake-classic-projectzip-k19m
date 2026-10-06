'use strict';
/*
 * SoloHost Feedback Hub — lives inside the AI panel (Feedback tab).
 * Unread notices update the AI button badge. Donate accounts come from hub.sync() only (never hard-coded).
 */
(function () {
  const $$ = id => document.getElementById(id);
  const add = (lg, o) => { if (typeof I18N !== 'undefined' && I18N[lg]) Object.assign(I18N[lg], o); };
  add('en', { fbBtn: 'FEEDBACK', fbSent: 'Thank you! Feedback sent ✔', fbFail: 'Could not send', fbEmpty: 'Please write a message', fbHubOff: 'Feedback Hub offline', fbHubOn: 'Feedback Hub connected', fbUpdate: 'Update available', fbUpdateOk: 'GOT IT', fbDonate: 'Support the author', fbNudge: 'Enjoying the game? You can support the author below.', fbThanks: 'Thanks for your support ❤', fbPaid: 'REPORT PAYMENT', fbCopy: 'COPY', fbHubMsg: 'From Feedback Hub', fbDismiss: 'OK' });
  add('vi', { fbBtn: 'GÓP Ý', fbSent: 'Cảm ơn bạn! Đã gửi góp ý ✔', fbFail: 'Không gửi được', fbEmpty: 'Hãy nhập nội dung', fbHubOff: 'Feedback Hub ngoại tuyến', fbHubOn: 'Đã kết nối Feedback Hub', fbUpdate: 'Có bản cập nhật', fbUpdateOk: 'ĐÃ BIẾT', fbDonate: 'Ủng hộ tác giả', fbNudge: 'Thấy game vui? Bạn có thể ủng hộ tác giả ở bên dưới.', fbThanks: 'Cảm ơn bạn đã ủng hộ ❤', fbPaid: 'BÁO ĐÃ THANH TOÁN', fbCopy: 'COPY', fbHubMsg: 'Từ Feedback Hub', fbDismiss: 'ĐÃ BIẾT' });
  if (typeof applyLang === 'function') applyLang();

  let hub = null, snap = null, state = 'off', rating = 0, cfg = null, unread = 0;
  const seen = new Set();
  try { JSON.parse(localStorage.getItem('shfh_seen_notices') || '[]').forEach(id => seen.add(String(id))); } catch (e) {}

  const loadScript = (src, ms) => new Promise(res => {
    const s = document.createElement('script'); let done = false;
    const fin = ok => { if (!done) { done = true; clearTimeout(tm); res(ok); } }, tm = setTimeout(() => fin(false), ms || 4000);
    s.src = src; s.async = true; s.onload = () => fin(typeof window.SHFH !== 'undefined'); s.onerror = () => fin(false); document.head.appendChild(s);
  });

  function setBadge(n) {
    unread = Math.max(0, n | 0);
    const b = $$('ai-badge'), t = $$('fb-tab-badge');
    [b, t].forEach(el => {
      if (!el) return;
      if (unread > 0) { el.style.display = ''; el.textContent = unread > 9 ? '9+' : String(unread); }
      else el.style.display = 'none';
    });
  }
  function persistSeen() {
    try { localStorage.setItem('shfh_seen_notices', JSON.stringify([...seen].slice(-80))); } catch (e) {}
  }
  function noticeList(s) {
    const out = [];
    const push = (id, title, body) => {
      const b = String(body || title || '').slice(0, 200); if (!b) return;
      out.push({ id: String(id || b), title: String(title || 'Hub').slice(0, 80), body: b });
    };
    ['notices', 'notifications', 'messages', 'inbox', 'replies'].forEach(k => {
      const arr = s && s[k]; if (!Array.isArray(arr)) return;
      arr.forEach((n, i) => {
        if (n == null) return;
        if (typeof n === 'string') push(k + i, 'Hub', n);
        else push(n.id || n.key || (k + i), n.title || n.subject || 'Hub', n.body || n.message || n.text || n.note);
      });
    });
    if (s && s.reply && (s.reply.message || s.reply.text)) push(s.reply.id || 'reply', s.reply.title || 'Hub', s.reply.message || s.reply.text);
    return out.slice(0, 8);
  }

  function renderDonate(nudge) {
    const box = $$('fb-donate'); if (!box) return;
    box.innerHTML = '';
    const d = snap && snap.donate, rows = [];
    if (d && typeof d === 'object') {
      for (const k of Object.keys(d)) {
        const v = d[k];
        if (typeof v === 'string' || typeof v === 'number') rows.push([k, String(v)]);
        else if (v && typeof v === 'object') for (const k2 of Object.keys(v)) if (typeof v[k2] === 'string' || typeof v[k2] === 'number') rows.push([k + ' · ' + k2, String(v[k2])]);
      }
    }
    const pay = snap && snap.payment && snap.payment.state;
    if (!rows.length && !nudge) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    const h = document.createElement('b'); h.textContent = (typeof t === 'function' ? t('fbDonate') : 'Support'); box.appendChild(h);
    if (nudge) { const p = document.createElement('div'); p.className = 'small'; p.textContent = (typeof t === 'function' ? t('fbNudge') : ''); box.appendChild(p); }
    rows.slice(0, 10).forEach(([k, v]) => {
      const row = document.createElement('div'); row.className = 'fb-acc';
      const lab = document.createElement('div'); lab.className = 'fb-k'; lab.textContent = k;
      const val = document.createElement('code'); val.className = 'fb-val'; val.textContent = v;
      row.appendChild(lab); row.appendChild(val);
      if (String(v).replace(/\s/g, '').length >= 6) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-secondary fb-copy'; b.textContent = 'COPY';
        b.onclick = () => { if (typeof copyText === 'function') copyText(String(v)); else try { navigator.clipboard.writeText(String(v)); } catch (e) {} };
        row.appendChild(b);
      }
      box.appendChild(row);
    });
    if (rows.length && pay !== 'free' && pay !== 'waived') {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-secondary'; b.textContent = (typeof t === 'function' ? t('fbPaid') : 'REPORT PAYMENT');
      b.onclick = () => { const p = $$('fb-pay'); if (p) p.style.display = ''; };
      box.appendChild(b);
    }
  }

  function renderNotices(s) {
    const box = $$('fb-hub-notices'); if (!box) return;
    const list = noticeList(s);
    let fresh = 0;
    list.forEach(n => { if (!seen.has(n.id)) fresh++; });
    setBadge(fresh);
    box.innerHTML = '';
    if (!list.length) return;
    list.forEach(n => {
      const card = document.createElement('div'); card.className = 'fb-note';
      const b = document.createElement('b'); b.textContent = n.title; card.appendChild(b);
      const p = document.createElement('div'); p.textContent = n.body; card.appendChild(p);
      box.appendChild(card);
    });
  }

  function applySnapshot() {
    if (!snap) return;
    const acts = Array.isArray(snap.actions) ? snap.actions : [];
    if (snap.update && snap.update.needed) {
      const it = snap.update.item || {}, box = $$('fb-update');
      if (box) {
        box.style.display = 'block'; box.innerHTML = '';
        const b = document.createElement('b'); b.textContent = (typeof t === 'function' ? t('fbUpdate') : 'Update') + (it.version ? ' · ' + String(it.version) : ''); box.appendChild(b);
        const msg = it.title || it.message || it.notes; if (msg) { const p = document.createElement('div'); p.textContent = String(msg).slice(0, 200); box.appendChild(p); }
        const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn-secondary'; ok.textContent = (typeof t === 'function' ? t('fbUpdateOk') : 'GOT IT');
        ok.onclick = () => { try { if (it.id != null) hub.markUpdateSeen(it.id); } catch (e) {} box.style.display = 'none'; }; box.appendChild(ok);
      }
    }
    if (acts.includes('payment_ok') || acts.includes('thanks')) { try { toast(typeof t === 'function' ? t('fbThanks') : 'Thanks'); } catch (e) {} }
    renderDonate(acts.includes('unpaid_nudge'));
    renderNotices(snap);
  }

  window.__fbMarkRead = function () {
    noticeList(snap).forEach(n => seen.add(n.id));
    persistSeen();
    setBadge(0);
    try { if (hub && hub.markRead) hub.markRead('all'); } catch (e) {}
  };

  async function boot() {
    try { cfg = await fetch('/api/shfh-config').then(r => r.json()); } catch (e) { return; }
    if (!cfg || cfg.enabled === false) return;
    const hubUrl = cfg.hubUrl || '';
    let ok = false;
    if (hubUrl && !(location.protocol === 'https:' && /^http:/i.test(hubUrl))) ok = await loadScript(hubUrl + '/api/sdk.js');
    if (!ok) ok = await loadScript('/shfh-client.js', 2500);
    if (!ok) {
      state = 'off';
      const st = $$('fb-status'); if (st) st.textContent = (typeof t === 'function' ? t('fbHubOff') : 'offline');
      return;
    }
    try {
      hub = window.SHFH.create({ hubUrl, ingestToken: cfg.ingestToken || '', appId: cfg.appId, appName: cfg.appName, version: cfg.version, platform: cfg.platform || 'solohost', locale: (typeof lang !== 'undefined' ? lang : 'en') });
      state = 'on';
      snap = await hub.sync();
    } catch (e) { state = hub ? 'on' : 'off'; snap = null; }
    const st = $$('fb-status'); if (st) st.textContent = state === 'on' ? (typeof t === 'function' ? t('fbHubOn') : 'connected') : (typeof t === 'function' ? t('fbHubOff') : 'offline');
    applySnapshot();
  }

  async function send() {
    const message = ($$('fb-text') && $$('fb-text').value || '').trim();
    if (!message) { if ($$('fb-msg')) $$('fb-msg').textContent = (typeof t === 'function' ? t('fbEmpty') : 'empty'); return; }
    if (!hub) { if ($$('fb-msg')) $$('fb-msg').textContent = (typeof t === 'function' ? t('fbHubOff') : 'offline'); return; }
    const payload = { type: ($$('fb-type') && $$('fb-type').value) || 'other', message: message.slice(0, 1000) };
    if (rating) payload.rating = rating;
    if ($$('fb-send')) $$('fb-send').disabled = true;
    try {
      await hub.sendFeedback(payload);
      if ($$('fb-text')) $$('fb-text').value = '';
      rating = 0;
      document.querySelectorAll('#fb-stars button').forEach(b => b.classList.remove('on'));
      if ($$('fb-msg')) $$('fb-msg').textContent = (typeof t === 'function' ? t('fbSent') : 'sent');
      try { toast(typeof t === 'function' ? t('fbSent') : 'sent'); } catch (e) {}
    } catch (e) {
      if ($$('fb-msg')) $$('fb-msg').textContent = (typeof t === 'function' ? t('fbFail') : 'fail') + (e && e.message ? ': ' + String(e.message).slice(0, 100) : '');
    }
    if ($$('fb-send')) $$('fb-send').disabled = false;
  }

  async function pay() {
    if (!hub) return;
    const txn_id = ($$('fb-txn') && $$('fb-txn').value || '').trim();
    const method = ($$('fb-method') && $$('fb-method').value || '').trim();
    const amount = ($$('fb-amount') && $$('fb-amount').value || '').trim();
    if (!txn_id) { if ($$('fb-msg')) $$('fb-msg').textContent = (typeof t === 'function' ? t('fbEmpty') : 'empty'); return; }
    try {
      await hub.reportPayment({ txn_id, method, amount });
      if ($$('fb-msg')) $$('fb-msg').textContent = 'Payment reported ✔';
      try { snap = await hub.sync(); applySnapshot(); } catch (e) {}
      if ($$('fb-pay')) $$('fb-pay').style.display = 'none';
    } catch (e) {
      if ($$('fb-msg')) $$('fb-msg').textContent = (typeof t === 'function' ? t('fbFail') : 'fail') + (e && e.message ? ': ' + String(e.message).slice(0, 100) : '');
    }
  }

  function bind() {
    if ($$('fb-send')) $$('fb-send').onclick = send;
    if ($$('fb-paysend')) $$('fb-paysend').onclick = pay;
    if ($$('fb-paycancel')) $$('fb-paycancel').onclick = () => { if ($$('fb-pay')) $$('fb-pay').style.display = 'none'; };
    document.querySelectorAll('#fb-stars button').forEach(b => {
      b.onclick = () => {
        const n = +b.getAttribute('data-n');
        rating = rating === n ? 0 : n;
        document.querySelectorAll('#fb-stars button').forEach(x => x.classList.toggle('on', +x.getAttribute('data-n') <= rating && rating > 0));
      };
    });
  }

  bind();
  boot();
  setInterval(async () => {
    if (!hub || state !== 'on') return;
    try { snap = await hub.sync(); applySnapshot(); } catch (e) {}
  }, 45000);
})();
