'use strict';
const $ = id => document.getElementById(id), cv = $('gameCanvas'), cx = cv.getContext('2d'), CELL = 20;

const I18N = {
  en: {
    score:'SCORE', sound:'Sound', quickPlay:'QUICK PLAY (1P)', soloMode:'SOLO / PICK MODE', createRoom:'CREATE MULTIPLAYER ROOM',
    joinRoom:'JOIN', howTo:'HOW TO PLAY', lanBtn:'LAN CONNECT', room:'ROOM', start:'START', leave:'LEAVE ROOM',
    settings:'SETTINGS', vibrate:'Vibrate (phone)', copyInvite:'COPY INVITE LINK', pause:'PAUSE', resume:'RESUME',
    fullscreen:'FULLSCREEN', continue:'CONTINUE', helpTitle:'HOW TO PLAY', gotIt:'GOT IT', lanTitle:'LAN CONNECT',
    close:'CLOSE', gameOver:'GAME OVER', playAgain:'PLAY AGAIN', backLobby:'BACK TO ROOM', backMenu:'MAIN MENU',
    namePh:'Name', codePh:'CODE', send:'SEND', chatPh:'Chat · @ai asks the referee', aiAsk:'Ask the referee…', aiKeyBtn:'🔑 KEY', aiKeyTitle:'AI CONNECTION', aiKeyHelp:'Choose a provider. Leave model empty to automatically test and choose a working model. Local AI can work without a cloud token.', aiToken:'API key / token', aiModel:'Model (optional — auto if empty)', aiBaseUrl:'Base URL (optional for local/custom)', aiPin:'Admin PIN', aiSave:'SAVE & TEST', aiRemove:'REMOVE KEY', cancel:'CANCEL', aiLocal:'Local referee · tap 🔑 to add an AI token', aiOn:'AI on: {0}', aiBad:'Key rejected or provider error', aiSaved:'AI connected ✔', aiTesting:'Testing…', aiNeedKey:'No AI token yet. Enter one, or cancel to keep the local referee.', aiTooShort:'Token looks too short', aiOffline:'AI offline', chatOverlay:'Show chat on screen',
    skinSolid:'Skin: Solid', skinGrad:'Skin: Fade', skinDots:'Skin: Dots', skinStripes:'Skin: Stripes', skinGlow:'Skin: Neon', skinRainbow:'Skin: Rainbow',
    modeCoop:'Co-op', modeSurv:'Survival', modeTime:'Time Attack', modeLevels:'Campaign',
    diffEasy:'Easy', diffNorm:'Normal', diffHard:'Hard',
    coop:'Co-op: team shares 3 lives, snakes pass through each other, score together.',
    survival:'Survival: colliding ends you. Last snake standing wins. Walls grow every 10 seconds.',
    timeattack:'Time Attack: 90 seconds, highest score wins. Respawn after 3 seconds.',
    levels:'Campaign: reach the team score to clear a stage. Maps and speed change. Shared 3 lives.',
    helpHtml:'<p><b>Goal:</b> eat 🍎 to grow and score. Do not hit walls, yourself, or other snakes.</p><p><b>Controls:</b> PC/TV: arrows or W A S D · phone: swipe or ▲▼◀▶ · ⚙ or Esc: settings.</p><p><b>Items:</b> 🍎 +10 · ✖2 double points & length · ⚡ speed 8s · ❄️ freeze others 4s · purple: portals.</p><p><b>Modes:</b> Co-op (3 shared lives) · Survival (last one wins) · Time Attack (90s) · Campaign (12 themed stages).</p><p><b>Play with family:</b> Create a room, then open LAN Connect and share the URL. Add BOTS if you need extra players.</p>',
    lanIntro:'Open this URL on phones/TVs on the same Wi-Fi as the host:',
    lanSteps:'<p><b>Find the LAN IP on Windows:</b> 1) Press Windows, type <b>cmd</b>, Enter. 2) Type <b>ipconfig</b>, Enter. 3) Find <b>IPv4 Address</b>, e.g. 192.168.1.23. 4) Open <b>http://192.168.1.23:PORT</b> (PORT = the number SoloHost shows for this app, same as in the address bar). Or double-click <b>show-ip-windows.bat</b>.</p><p><b>Mac:</b> Terminal → <b>ipconfig getifaddr en0</b>. <b>Linux:</b> <b>hostname -I</b>.</p><p><b>Cannot connect?</b> Same Wi-Fi · when Windows Firewall asks, allow Private networks · use 192.168.x.x or 10.x.x.x.</p>',
    invite:'Invite family to open: ', codeWord:' · code ',
    rec:'Record ', roomsOpen:'Open rooms (tap to join)', noRoom:'You are not in a room.',
    copied:'Copied!', lost:'disconnected', you:' ← you',
    ready:'Ready! The snake with ★ is yours', paused:'PAUSED — tap to continue',
    dead:'You are out — wait to respawn or for the next round',
    teamScore:'Team score: ', reached:'Reached stage ', record:'Record: ',
    using:'in use', suggest:'suggested', finding:'Looking…', noIp:'Could not auto-detect IP. Follow the steps below.', noSrv:'Could not reach the server.',
    pingLost:'reconnecting…'
  },
  vi: {
    score:'ĐIỂM', sound:'Âm thanh', quickPlay:'CHƠI NHANH (1 NGƯỜI)', soloMode:'CHƠI ĐƠN / CHỌN CHẾ ĐỘ', createRoom:'TẠO PHÒNG NHIỀU NGƯỜI',
    joinRoom:'VÀO PHÒNG', howTo:'HƯỚNG DẪN', lanBtn:'KẾT NỐI LAN', room:'PHÒNG', start:'BẮT ĐẦU', leave:'RỜI PHÒNG',
    settings:'CÀI ĐẶT', vibrate:'Rung (điện thoại)', copyInvite:'SAO CHÉP LINK MỜI', pause:'TẠM DỪNG', resume:'TIẾP TỤC CHƠI',
    fullscreen:'TOÀN MÀN HÌNH', continue:'TIẾP TỤC', helpTitle:'HƯỚNG DẪN CHƠI', gotIt:'ĐÃ HIỂU', lanTitle:'KẾT NỐI LAN',
    close:'ĐÓNG', gameOver:'KẾT THÚC', playAgain:'CHƠI LẠI', backLobby:'VỀ PHÒNG', backMenu:'VỀ MENU',
    namePh:'Tên', codePh:'MÃ', send:'GỬI', chatPh:'Chat · @ai để hỏi trọng tài', aiAsk:'Hỏi trọng tài…', aiKeyBtn:'🔑 KHÓA', aiKeyTitle:'KẾT NỐI AI', aiKeyHelp:'Chọn nhà cung cấp. Để trống model để AI tự thử và chọn model đang hoạt động. AI cục bộ có thể dùng không cần token cloud.', aiToken:'API key / token', aiModel:'Model (tùy chọn — tự chọn nếu trống)', aiBaseUrl:'Base URL (tùy chọn cho local/custom)', aiPin:'Mã PIN quản trị', aiSave:'LƯU & THỬ', aiRemove:'XÓA TOKEN', cancel:'HỦY', aiLocal:'Trọng tài nội bộ · chạm 🔑 để thêm token AI', aiOn:'AI đang bật: {0}', aiBad:'Token bị từ chối hoặc lỗi nhà cung cấp', aiSaved:'Đã kết nối AI ✔', aiTesting:'Đang thử…', aiNeedKey:'Chưa có token AI. Hãy nhập, hoặc hủy để dùng trọng tài nội bộ.', aiTooShort:'Token quá ngắn', aiOffline:'AI ngoại tuyến', chatOverlay:'Hiện chat trên màn hình',
    skinSolid:'Skin: Trơn', skinGrad:'Skin: Mờ dần', skinDots:'Skin: Chấm tròn', skinStripes:'Skin: Sọc', skinGlow:'Skin: Neon', skinRainbow:'Skin: Cầu vồng',
    modeCoop:'Co-op', modeSurv:'Sinh tồn', modeTime:'Đua thời gian', modeLevels:'Màn chơi',
    diffEasy:'Dễ', diffNorm:'Thường', diffHard:'Khó',
    coop:'Co-op: cả nhóm chung 3 mạng, rắn xuyên qua nhau, cùng ghi điểm đội.',
    survival:'Sinh tồn: va chạm là thua. Người sống sót cuối cùng thắng, tường mọc thêm mỗi 10 giây.',
    timeattack:'Đua thời gian: 90 giây, ai nhiều điểm nhất thắng. Thua thì hồi sinh sau 3 giây.',
    levels:'Màn chơi: đủ điểm đội thì lên màn, bản đồ và tốc độ thay đổi. Chung 3 mạng. 12 màn chủ đề.',
    helpHtml:'<p><b>Mục tiêu:</b> điều khiển rắn ăn mồi 🍎 để dài ra và ghi điểm. Đừng đâm vào tường, thân mình hay rắn khác.</p><p><b>Điều khiển:</b> máy tính/TV: phím mũi tên hoặc W A S D · điện thoại: vuốt hoặc ▲▼◀▶ · ⚙ hoặc Esc: cài đặt.</p><p><b>Vật phẩm:</b> 🍎 +10 · ✖2 điểm và độ dài gấp đôi · ⚡ nhanh 8 giây · ❄️ đóng băng người khác 4 giây · tím: cổng dịch chuyển.</p><p><b>Chế độ:</b> Co-op (chung 3 mạng) · Sinh tồn · Đua thời gian (90 giây) · Màn chơi (12 cấp chủ đề).</p><p><b>Chơi cùng người thân:</b> tạo phòng, mở “Kết nối LAN” và chia sẻ đường dẫn. Thiếu người thì thêm BOT.</p>',
    lanIntro:'Đường dẫn vào game (điện thoại/TV cùng Wi-Fi với máy chủ):',
    lanSteps:'<p><b>Tự tìm IP trên Windows:</b> 1) Bấm phím Windows, gõ <b>cmd</b>, Enter. 2) Gõ <b>ipconfig</b>, Enter. 3) Tìm dòng <b>IPv4 Address</b>, ví dụ 192.168.1.23. 4) Đường dẫn là <b>http://192.168.1.23:PORT</b> (PORT = số cổng SoloHost cấp cho app, giống trên thanh địa chỉ). Hoặc nhấp đúp <b>show-ip-windows.bat</b>.</p><p><b>Mac:</b> Terminal → <b>ipconfig getifaddr en0</b>. <b>Linux:</b> <b>hostname -I</b>.</p><p><b>Không vào được?</b> Cùng Wi-Fi · khi Windows hỏi Firewall, chọn “Private networks” · chọn 192.168.x.x hoặc 10.x.x.x.</p>',
    invite:'Mời người thân mở: ', codeWord:' · mã ',
    rec:'Kỷ lục ', roomsOpen:'Phòng đang mở (chạm để vào)', noRoom:'Bạn chưa ở trong phòng nào.',
    copied:'Đã sao chép!', lost:'mất kết nối', you:' ← bạn',
    ready:'Sẵn sàng! Rắn có dấu ★ là của bạn', paused:'TẠM DỪNG — chạm để tiếp tục',
    dead:'Bạn đã thua — chờ hồi sinh hoặc ván sau',
    teamScore:'Điểm đội: ', reached:'Đến màn ', record:'Kỷ lục: ',
    using:'đang dùng', suggest:'gợi ý', finding:'Đang tìm…', noIp:'Chưa tự tìm được IP, hãy làm theo hướng dẫn bên dưới.', noSrv:'Không lấy được thông tin từ máy chủ.',
    pingLost:'mất kết nối, đang nối lại…'
  }
};
let lang = localStorage.snakeLang === 'vi' ? 'vi' : 'en';
const t = k => (I18N[lang] && I18N[lang][k]) != null ? I18N[lang][k] : (I18N.en[k] || k);
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.getAttribute('data-i18n'); if (I18N[lang][k]) el.textContent = I18N[lang][k]; });
  document.querySelectorAll('[data-ph]').forEach(el => { const k = el.getAttribute('data-ph'); if (I18N[lang][k]) el.placeholder = I18N[lang][k]; });
  const hb = $('help-body'); if (hb) hb.innerHTML = t('helpHtml');
  const ls = $('lan-steps'); if (ls) ls.innerHTML = t('lanSteps');
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('on', b.id.endsWith(lang)));
  if (typeof MODE_INFO !== 'undefined') { MODE_INFO.coop = t('coop'); MODE_INFO.survival = t('survival'); MODE_INFO.timeattack = t('timeattack'); MODE_INFO.levels = t('levels'); }
  if (room && $('modeinfo')) $('modeinfo').textContent = MODE_INFO[room.mode] || '';
}
function setLang(l) { lang = l === 'vi' ? 'vi' : 'en'; localStorage.snakeLang = lang; applyLang(); if (typeof fillSettings === 'function' && $('screen-settings').classList.contains('active')) fillSettings(); }

I18N.en.roomLine = (code,mode,h,b) => `Room ${code} · ${mode} · ${h} player${h!==1?'s':''}${b?' + '+b+' bot':''}`;
I18N.vi.roomLine = (code,mode,h,b) => `Phòng ${code} · ${mode} · ${h} người${b?' + '+b+' bot':''}`;
let sound = localStorage.getItem('snakeSound') !== 'off', ac = null, lastSc = 0, wasAlive = true;
function beep(f, d) { if (!sound) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), v = ac.createGain();
  o.frequency.value = f; v.gain.value = .08; o.connect(v); v.connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (e) {} }
const myId = sessionStorage.snakeId || (sessionStorage.snakeId = Math.random().toString(36).slice(2, 12) + Date.now().toString(36));
const socket = io(); let room = null, map = null, st = null, playing = false;
const communicationPause = window.SnakeCommunicationPause.create({
  isPlaying: () => playing,
  isPaused: () => !!(st && st.ps),
  canPause: () => !!(room && room.players && room.players.filter(p => !p.bot).length === 1),
  pause: () => socket.emit('pause'),
  resume: () => socket.emit('pause')
});
const COLORS = ['#39ff14', '#00f3ff', '#ffea00', '#ff007f', '#ff7a00', '#b266ff'];
const prof = Object.assign({ name: 'Player' + (10 + Math.random() * 89 | 0), color: COLORS[0], skin: 'solid' },
  JSON.parse(localStorage.getItem('snakeProfile') || '{}'));

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  $('overlay-container').style.display = id ? 'block' : 'none';
}
function saveProfile() {
  prof.name = $('name').value.trim() || prof.name; prof.color = $('color').value; prof.skin = $('skin').value;
  localStorage.setItem('snakeProfile', JSON.stringify(prof)); if (room) socket.emit('profile', prof);
}
$('snd').checked = sound; $('snd').onchange = e => { sound = e.target.checked; localStorage.setItem('snakeSound', sound ? 'on' : 'off'); };
$('name').value = prof.name; $('color').value = prof.color; $('skin').value = prof.skin;
COLORS.forEach(c => { const d = document.createElement('div'); d.className = 'sw'; d.style.background = c;
  d.onclick = () => { $('color').value = c; saveProfile(); }; $('swatches').appendChild(d); });
['name', 'color', 'skin'].forEach(i => $(i).addEventListener('input', saveProfile));
const err = m => { $('err').textContent = m || ''; };

$('b-solo').onclick = () => { saveProfile(); socket.emit('create', { pid: myId, profile: prof }, () => socket.emit('start')); };
$('b-create').onclick = () => { saveProfile(); socket.emit('create', { pid: myId, profile: prof }, () => {}); };
$('b-join').onclick = () => { saveProfile(); socket.emit('join', { code: $('code').value, pid: myId, profile: prof }, r => err(r.ok ? '' : r.err)); };
$('b-start').onclick = () => socket.emit('start');
$('b-leave').onclick = () => { communicationPause.reset(); sessionStorage.removeItem('snakeRoom'); socket.emit('leave'); room = null; show('screen-menu'); };
$('b-again').onclick = () => show('screen-lobby');
$('mode').onchange = $('map').onchange = $('diff').onchange = () => socket.emit('config', { mode: $('mode').value, map: $('map').value, diff: $('diff').value });
$('b-bot').onclick = () => socket.emit('bot', true); $('b-unbot').onclick = () => socket.emit('bot', false);

socket.on('lobby', l => {
  room = l; sessionStorage.snakeRoom = l.code; const host = l.host === myId;
  $('l-code').textContent = l.code; $('mode').value = l.mode; $('map').value = l.map;
  $('diff').value = l.diff; $('modeinfo').textContent = MODE_INFO[l.mode] || ''; $('mode').disabled = $('map').disabled = $('diff').disabled = !host;
  $('b-bot').style.display = $('b-unbot').style.display = host ? '' : 'none';
  const pub = rewritePort(l.url || (hosts && hosts.publicUrl) || location.origin);
  const lan = rewritePort((l.lan && l.lan[0]) || (hosts && hosts.lanUrls && hosts.lanUrls[0]) || location.origin);
  $('share').textContent = t('invite') + (pub || lan) + t('codeWord') + l.code;
  paintQr($('qr-public'), pub || lan); paintQr($('qr-lan'), lan);

  const me = l.players.find(p => p.id === myId); if (!me && !playing) { sessionStorage.removeItem('snakeRoom'); room = null; show('screen-menu'); } $('b-start').style.display = host ? '' : 'none';
  $('plist').innerHTML = l.players.map(p => `<li><span class="dot" style="background:${p.color}"></span>${p.name.replace(/</g, '')}${p.id === l.host ? ' 👑' : ''}${p.bot ? ' 🤖' : ''}${p.off ? ' (' + t('lost') + ')' : ''} · ${p.chips|0}¢</li>`).join('');
  $('l-best').textContent = t('rec') + (MODE_NAME[l.mode] || l.mode) + ': ' + (l.scores[l.mode] || 0);
  fillLevelPreview(l);
  if (!playing && !document.querySelector('#screen-over.active,#screen-settings.active,#screen-help.active,#screen-connect.active')) show('screen-lobby');
  if (document.querySelector('#screen-settings.active')) fillSettings();
});
socket.on('start', d => { map = d.map; playing = true; st = null; if (!document.querySelector('#screen-settings.active,#screen-help.active,#screen-connect.active')) show(null); try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {} $('info-label').textContent = d.mode === 'levels' ? 'LEVEL' : d.mode === 'coop' ? 'LIVES' : d.mode === 'timeattack' ? 'TIME' : 'ALIVE'; lastSc = 0; wasAlive = true; if (d.level > 1) { beep(880, .25); toast((d.ln || 'LEVEL') + ' · ' + d.level); } });
socket.on('map', g => { if (map) map.g = g; });
socket.on('s', s => { st = s; communicationPause.sync(); render(); });
socket.on('over', o => {
  communicationPause.reset();
  playing = false; $('results').innerHTML = o.results.map((p, i) => `<li><span class="dot" style="background:${p.c}"></span>${i === 0 ? '🏆 ' : ''}${p.n} — ${p.sc}</li>`).join('');
  $('o-best').textContent = (o.mode === 'coop' || o.mode === 'levels' ? (o.mode === 'levels' ? t('reached') + o.level + ' · ' : '') + t('teamScore') + o.team + ' · ' : '') + t('record') + o.best; show('screen-over'); $('b-replay').style.display = room && room.host === myId ? '' : 'none';
  vib(200);
});

function segColor(p, i, n) {
  if (p.k === 'rainbow') return `hsl(${(i * 30 + st.t * 4) % 360},100%,55%)`;
  if (p.k === 'stripes' && i % 2) return '#ffffff55';
  return i === 0 ? '#fff' : p.c;
}
function render() {
  if (!map || !st) return;
  const theme = MAP_THEME[(map.name || (room && room.map) || 'open')] || MAP_THEME.open;
  cx.fillStyle = theme.bg; cx.fillRect(0, 0, 600, 600);
  drawTiles(theme);
  const icon = { n: '🍎', x2: '✖2', sp: '⚡', fz: '❄️' };
  cx.font = '16px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  st.foods.forEach(([x, y, t]) => { cx.fillStyle = '#fff'; cx.fillText(icon[t], x * CELL + 10, y * CELL + 11); });
  let mine = null;
  st.p.forEach(p => { if (p.id === myId) mine = p; if (!p.a) return;
    cx.shadowBlur = p.k === 'glow' ? 12 : 0; cx.shadowColor = p.c;
    p.b.forEach((b, i) => { cx.fillStyle = st.fz && st.fz !== p.id ? '#8ce' : segColor(p, i); cx.globalAlpha = p.k === 'gradient' ? Math.max(.25, 1 - i / p.b.length) : 1;
      if (p.k === 'dots') { cx.beginPath(); cx.arc(b[0] * CELL + 10, b[1] * CELL + 10, i ? 7 : 9, 0, 7); cx.fill(); } else cx.fillRect(b[0] * CELL + 1, b[1] * CELL + 1, CELL - 2, CELL - 2); });
    cx.globalAlpha = 1;
    cx.shadowBlur = 0; cx.fillStyle = '#fff'; cx.font = '10px sans-serif'; cx.fillText(p.n + (p.id === myId ? ' ★' : ''), p.b[0][0] * CELL + 10, p.b[0][1] * CELL - 4); });
  drawBubbles();
  $('score-display').textContent = mine ? mine.sc : 0;
  if (mine) { if (mine.sc > lastSc) beep(600, .08); if (wasAlive && !mine.a) { beep(120, .35); vib(150); } lastSc = mine.sc; wasAlive = mine.a; }
  const lab = $('info-label').textContent;
  $('info-display').textContent = st.left != null ? st.left + 's' : lab === 'LEVEL' ? (st.ln ? st.ln.replace(/ .*/, '') + ' ' : '') + st.lv + ' ♥' + st.life + ' ' + st.team + '/' + st.tg : lab === 'LIVES' ? '♥' + st.life : st.p.filter(p => p.a).length;
  const pu = $('active-powerup'); const t = mine && mine.sp ? '⚡ SPEED' : st.fz ? (st.fz === myId ? '❄️ FREEZE!' : '❄️ FROZEN') : '';
  pu.classList.toggle('hidden', !t); $('powerup-text').textContent = t; drawOverlay(mine);
}

// ---- input: keyboard / TV remote, D-pad, swipe ----
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const send = d => { if (playing) socket.emit('dir', d); };
addEventListener('keydown', e => { const d = KEYS[e.key]; if (d && playing && !typing(e)) { e.preventDefault(); send(d); } });
['up', 'down', 'left', 'right'].forEach(d => { const b = $('btn-' + d);
  const f = e => { e.preventDefault(); send(d); vib(10); };
  b.addEventListener('touchstart', f, { passive: false }); b.addEventListener('mousedown', f); });
let t0 = null;
cv.addEventListener('touchstart', e => { t0 = e.touches[0]; }, { passive: true });
cv.addEventListener('touchend', e => { if (!t0) return; const t = e.changedTouches[0], dx = t.clientX - t0.clientX, dy = t.clientY - t0.clientY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) send(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); t0 = null; });


function toast(m) { const t = $('powerup-text'); $('active-powerup').classList.remove('hidden'); t.textContent = m; setTimeout(() => $('active-powerup').classList.add('hidden'), 1500); }

// ---- kết nối: ping, tự nối lại, danh sách phòng LAN ----
let lanUrls = ''; fetch('/api/info').then(r => r.json()).then(i => { lanUrls = (i.urls || []).join(' hoặc '); }).catch(() => {});
const net = $('net'), setNet = (t, c) => { net.textContent = '● ' + t; net.style.color = c; };
setInterval(() => { if (!socket.connected) return; const t = Date.now();
  socket.emit('p', t, () => { const ms = Date.now() - t; setNet(ms + ' ms', ms < 80 ? '#39ff14' : ms < 200 ? '#ffea00' : '#ff4d4d'); }); }, 3000);
socket.on('connect', () => { setNet('online', '#39ff14'); const c = sessionStorage.snakeRoom;
  if (c) socket.emit('join', { pid: myId, code: c, profile: prof }, r => { if (!r.ok) { sessionStorage.removeItem('snakeRoom'); playing = false; room = null; show('screen-menu'); err(r.err); } }); });
socket.on('disconnect', () => setNet(t('pingLost'), '#ff4d4d'));
function refreshRooms() { if (!socket.connected || !$('screen-menu').classList.contains('active')) return;
  socket.emit('rooms', list => { const box = $('rooms'); box.innerHTML = list.length ? '<b>' + t('roomsOpen') + '</b>' : '';
    list.forEach(x => { const b = document.createElement('button'); b.className = 'btn-secondary';
      b.textContent = `${x.code} · ${x.host || '?'} · ${x.mode} · ${x.n}/${x.max}${x.phase === 'playing' ? ' ▶' : ''}`;
      b.onclick = () => { $('code').value = x.code; $('b-join').click(); }; box.appendChild(b); }); }); }
setInterval(refreshRooms, 3000); setTimeout(refreshRooms, 500);

// ---- v2.3: cài đặt trong ván, hướng dẫn, kết nối LAN, đếm ngược, tạm dừng ----
const MODE_INFO = { coop: t('coop'), survival: t('survival'), timeattack: t('timeattack'), levels: t('levels') };
const MODE_NAME = { coop: 'Co-op', survival: 'Survival', timeattack: 'Time Attack', levels: 'Campaign' };
const MAP_THEME = {
  open: { bg: '#05050a', wall: '#3a3a55' }, box: { bg: '#0a0814', wall: '#5a3aff' },
  maze: { bg: '#08140a', wall: '#1f8a4c' }, portal: { bg: '#120814', wall: '#b266ff' },
  plus: { bg: '#140a08', wall: '#ff7a00' }, ring: { bg: '#140810', wall: '#ff007f' },
  lanes: { bg: '#081014', wall: '#00f3ff' }, islands: { bg: '#0a1408', wall: '#39ff14' },
  spiral: { bg: '#10080a', wall: '#ff4d6d' }, diamond: { bg: '#0a1018', wall: '#7ad7ff' },
  forest: { bg: '#06140a', wall: '#2ecc71' }, corners: { bg: '#14100a', wall: '#f1c40f' },
  checker: { bg: '#101010', wall: '#95a5a6' }, twin: { bg: '#0c0a16', wall: '#9b59b6' },
  spikes: { bg: '#140808', wall: '#c0392b' }, mudflats: { bg: '#120e08', wall: '#8d6e63' }, turbo: { bg: '#08121a', wall: '#00bcd4' }, gates: { bg: '#14120a', wall: '#f1c40f' },
  snowflake: { bg: '#0a1420', wall: '#cfefff' }, bridges: { bg: '#0a0f18', wall: '#5c6bc0' }, pinball: { bg: '#140a18', wall: '#e91e63' }, zigzag: { bg: '#0a1410', wall: '#26a69a' },
  octagon: { bg: '#100c18', wall: '#ab47bc' }, volcano: { bg: '#180a06', wall: '#ff5722' }
};
const CAMPAIGN = [
  ['open','Open Field'],['box','The Box'],['portal','Portal Gate'],['maze','Labyrinth'],
  ['plus','Crossroads'],['ring','The Arena'],['lanes','Highway'],['islands','Islands'],
  ['spiral','Spiral Pit'],['diamond','Diamond'],['forest','Pixel Forest'],['corners','Four Corners'],
  ['checker','Checkers'],['twin','Twin Halls'],['maze','Deep Maze'],['portal','Warp Storm'],
  ['ring','Colosseum'],['forest','Night Grove'],['spiral','Inner Coil'],['plus','Final Cross']
];
function fillLevelPreview(l) {
  const box = $('level-preview'); if (!box) return;
  if (!l || l.mode !== 'levels') { box.innerHTML = ''; return; }
  box.innerHTML = (l.levels || CAMPAIGN).map((c, i) => `<span class="lv-chip" style="border-color:${(MAP_THEME[c[0]] || MAP_THEME.open).wall}">${i + 1}. ${c[1]}</span>`).join('');
}
const vibOn = () => localStorage.snakeVib !== 'off', vib = ms => { if (vibOn() && navigator.vibrate) navigator.vibrate(ms); };
const PANELS = ['screen-settings', 'screen-help', 'screen-connect']; let prevScr = null;
function openPanel(id) { const a = document.querySelector('.screen.active'); if (!a || !PANELS.includes(a.id)) prevScr = a ? a.id : null; show(id); if (id === 'screen-settings') fillSettings(); if (id === 'screen-connect') fillConnect(); }
function closePanel() { if (prevScr === 'screen-over') show('screen-over'); else if (playing) show(null); else show(room ? 'screen-lobby' : 'screen-menu'); }
function rewritePort(u) {
  if (!u) return u;
  try {
    const x = new URL(u, location.href);
    const want = location.port;
    if (want && x.port && x.port !== want && (x.port === '8080' || x.port === String(hosts && hosts.port || ''))) {
      x.port = want;
    }
    if (want && !x.port && location.protocol === x.protocol) { /* keep */ }
    return x.href.replace(/\/$/, '');
  } catch (e) { return u; }
}
function shareLink() { return rewritePort((hosts && hosts.publicUrl) || (room && room.url) || (hosts && hosts.lanUrls && hosts.lanUrls[0]) || lanUrls.split(' / ')[0] || location.origin); }
function copyText(txt) { try { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt).then(() => toast(t('copied')));
  const a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); toast(t('copied')); } catch (e) { prompt(t('copyInvite'), txt); } }
function fillSettings() {
  $('s-name').value = $('name').value; $('s-color').value = $('color').value; $('s-skin').value = $('skin').value; $('s-snd').checked = sound; $('s-vib').checked = vibOn(); $('s-chat').checked = chatShown();
  const humans = room ? room.players.filter(p => !p.bot).length : 0, bots = room ? room.players.length - humans : 0;
  $('s-room').textContent = room ? t('roomLine')(room.code, MODE_NAME[room.mode], humans, bots) : t('noRoom');
  $('s-plist').innerHTML = room ? room.players.map(p => `<li><span class="dot" style="background:${p.color}"></span>${p.name}${p.id === room.host ? ' 👑' : ''}${p.bot ? ' 🤖' : ''}${p.off ? ' (' + t('lost') + ')' : ''}${p.id === myId ? t('you') : ''}</li>`).join('') : '';
  $('s-copy').style.display = $('s-leave').style.display = room ? '' : 'none';
  $('s-pause').style.display = room && playing && humans === 1 ? '' : 'none'; $('s-pause').textContent = st && st.ps ? t('resume') : t('pause');
}
function qrSrc(url) { return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(url || ''); }
function paintQr(img, url) { if (!img) return; if (!url) { img.removeAttribute('src'); img.alt = ''; return; } img.src = qrSrc(url); img.alt = url; }
let hosts = null;
function applyHosts(i) {
  hosts = i || hosts; if (!hosts) return;
  lanUrls = (hosts.lanUrls || hosts.urls || []).join(' / ');
  if (room) {
    paintQr($('qr-public'), rewritePort(hosts.publicUrl || hosts.url || lanUrls.split(' / ')[0]));
    paintQr($('qr-lan'), rewritePort((hosts.lanUrls && hosts.lanUrls[0]) || location.origin));
  }
}
function fillConnect() {
  const box = $('c-urls'); box.innerHTML = t('finding');
  fetch('/api/info').then(r => r.json()).then(i => {
    applyHosts(i);
    const list = [];
    if (i.publicUrl) list.push([i.publicUrl, 'WAN']);
    (i.lanUrls || []).forEach(u => list.push([u, 'LAN']));
    if (!/^(localhost|127\.)/.test(location.hostname) && !list.some(x => x[0] === location.origin)) list.push([location.origin, t('using')]);
    box.innerHTML = list.length ? '' : '<i>' + t('noIp') + '</i>';
    list.forEach(([u, note]) => { const d = document.createElement('div'); d.className = 'row'; d.append(u + ' (' + note + ') ');
      const b = document.createElement('button'); b.className = 'btn-secondary'; b.textContent = t('copyInvite').split(' ')[0]; b.onclick = () => copyText(u); d.appendChild(b); box.appendChild(d); });
    const q = $('c-qrs'); if (q) {
      q.innerHTML = '';
      [['WAN / PLAY', i.publicUrl || i.url], ['LAN / Wi-Fi', (i.lanUrls && i.lanUrls[0]) || '']].forEach(([lab, u]) => {
        if (!u) return;
        const card = document.createElement('div'); card.className = 'qr-card';
        const im = document.createElement('img'); paintQr(im, u); card.appendChild(im);
        const cap = document.createElement('div'); cap.className = 'small'; cap.textContent = lab; card.appendChild(cap);
        q.appendChild(card);
      });
    }
  }).catch(() => { box.textContent = t('noSrv'); });
}
$('gear').onclick = () => { const a = document.querySelector('#screen-settings.active'); a ? closePanel() : openPanel('screen-settings'); };
$('s-skin').innerHTML = $('skin').innerHTML;
['name', 'color', 'skin'].forEach(k => $('s-' + k).addEventListener('input', e => { $(k).value = e.target.value; saveProfile(); if (k !== 'name') fillSettings(); }));
$('s-snd').onchange = e => { sound = e.target.checked; $('snd').checked = sound; localStorage.setItem('snakeSound', sound ? 'on' : 'off'); };
$('s-vib').onchange = e => localStorage.setItem('snakeVib', e.target.checked ? 'on' : 'off');
$('s-close').onclick = $('h-close').onclick = $('c-close').onclick = closePanel;
$('s-help').onclick = $('b-help').onclick = () => openPanel('screen-help');
$('s-conn').onclick = $('b-conn').onclick = () => openPanel('screen-connect');
$('s-copy').onclick = () => copyText(shareLink() + t('codeWord') + (room ? room.code : ''));
$('lang-en').onclick = $('s-lang-en').onclick = () => setLang('en');
$('lang-vi').onclick = $('s-lang-vi').onclick = () => setLang('vi');
$('s-pause').onclick = () => { socket.emit('pause'); closePanel(); };
$('s-full').onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} };
$('s-leave').onclick = () => { $('b-leave').onclick(); playing = false; st = null; };
$('b-custom').onclick = () => { saveProfile(); socket.emit('create', { pid: myId, profile: prof }, () => {}); };
$('b-replay').onclick = () => socket.emit('start');
$('b-menu').onclick = () => { $('b-leave').onclick(); };
cv.addEventListener('click', () => { if (st && st.ps) socket.emit('pause'); });
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!typing(e)) $('gear').onclick(); } else if ((e.key === 'p' || e.key === 'P') && playing && !typing(e)) socket.emit('pause'); });
function drawOverlay(mine) {
  if (st.ps || st.h > 0) { cx.fillStyle = '#000a'; cx.fillRect(0, 0, 600, 600); cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.font = 'bold 120px sans-serif'; cx.fillText(st.ps ? '⏸' : st.h, 300, 290);
    cx.font = 'bold 28px sans-serif'; cx.fillText(st.ps ? t('paused') : t('ready'), 300, 400);
    if (!st.ps && st.ln) { cx.font = 'bold 30px sans-serif'; cx.fillText(String(st.ln).replace(/^[a-z]/, c => c.toUpperCase()), 300, 130); }
    if (mine && mine.a && !st.ps) { cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.beginPath(); cx.arc(mine.b[0][0] * CELL + 10, mine.b[0][1] * CELL + 10, 20, 0, 7); cx.stroke(); } }
  else if (mine && !mine.a) { cx.fillStyle = '#000a'; cx.fillRect(0, 540, 600, 60); cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = 'bold 22px sans-serif'; cx.fillText(t('dead'), 300, 570); }
}
applyLang();
if (!localStorage.snakeSeen) { localStorage.snakeSeen = '1'; openPanel('screen-help'); }


socket.on('hosts', applyHosts);
fetch('/api/info').then(r => r.json()).then(applyHosts).catch(() => {});
setInterval(() => fetch('/api/info').then(r => r.json()).then(applyHosts).catch(() => {}), 30000);

const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
const chatShown = () => localStorage.snakeChat !== 'off';
$('s-chat').onchange = e => localStorage.setItem('snakeChat', e.target.checked ? 'on' : 'off');

// ---- v2.7: room chat (lobby + in game), emote bubbles, AI referee ----
const bubbles = {}, EMOTES = ['👍', '😂', '😮', '🔥', '👏', '😭', 'GG'];
function gameFeed(m) {                                   // floating chat lines over the canvas
  if (!chatShown()) return; const box = $('game-chat'); if (!box) return;
  const d = document.createElement('div'); d.className = 'gc-line' + (m.ai ? ' ai' : '');
  d.textContent = (m.ai ? '🤖 ' : (m.n ? m.n + ': ' : '')) + (m.text || '');
  box.appendChild(d); while (box.children.length > 5) box.removeChild(box.firstChild);
  setTimeout(() => { try { box.removeChild(d); } catch (e) {} }, 9000);
}
socket.on('ref', d => { if (d && d.text) { toast(d.text); addLog('ai-log', d.text); addLog('chat-log', d.text); gameFeed({ ai: true, text: String(d.text).replace(/^🤖\s*/, '') }); } });
socket.on('chat', m => {
  if (!m) return; if (!m.wait) addLog('chat-log', (m.ai ? '🤖 ' : '') + (m.n || '') + ': ' + (m.text || ''));
  gameFeed(m);
  if (m.emo && m.pid) bubbles[m.pid] = { e: m.emo, until: Date.now() + 2500 };
  if (!m.ai && m.pid && m.pid !== myId && playing) beep(520, .05);
});
socket.on('chat-log', list => { const l = $('chat-log'); if (l) l.innerHTML = ''; (list || []).forEach(m => addLog('chat-log', (m.ai ? '🤖 ' : '') + (m.n || '') + ': ' + (m.text || ''))); });
function addLog(id, text) { const log = document.getElementById(id); if (!log) return; const p = document.createElement('div'); p.textContent = text; log.prepend(p); while (log.children.length > 60) log.removeChild(log.lastChild); }
function drawBubbles() {
  if (!st) return; const now = Date.now();
  for (const id in bubbles) {
    const b = bubbles[id]; if (b.until < now) { delete bubbles[id]; continue; }
    const p = st.p.find(q => q.id === id); if (!p || !p.a) continue;
    const x = p.b[0][0] * CELL + 10, y = Math.max(16, p.b[0][1] * CELL - 20);
    cx.fillStyle = '#000b'; cx.fillRect(x - 17, y - 14, 34, 28); cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.font = b.e === 'GG' ? 'bold 16px sans-serif' : '20px sans-serif'; cx.fillText(b.e, x, y);
  }
}
function drawTiles(theme) {                              // 1 wall · 2 portal · 3 spikes · 4 mud · 5 boost pad · 7 closed gate (+ dashed markers for open gates)
  const T = st.t || 0, gk = new Set((map.gates || []).map(q => q[0] + ',' + q[1]));
  map.g.forEach((row, y) => row.forEach((v, x) => {
    const px = x * CELL, py = y * CELL;
    if (!v) { if (gk.has(x + ',' + y)) { cx.strokeStyle = st.gw && (T >> 2) % 2 ? '#ff4d4d' : '#f1c40f'; cx.lineWidth = 1; cx.setLineDash([3, 3]); cx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4); cx.setLineDash([]); } return; }
    if (v === 1) { cx.fillStyle = theme.wall; cx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); }
    else if (v === 3) { cx.fillStyle = '#3a0d0d'; cx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); cx.fillStyle = '#ff4d4d'; cx.beginPath(); cx.moveTo(px + 3, py + 17); cx.lineTo(px + 10, py + 3); cx.lineTo(px + 17, py + 17); cx.closePath(); cx.fill(); }
    else if (v === 4) { cx.fillStyle = '#5b3a1e'; cx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); cx.fillStyle = '#7a4f2a'; cx.beginPath(); cx.arc(px + 6, py + 7, 2.5, 0, 7); cx.arc(px + 14, py + 13, 3, 0, 7); cx.fill(); }
    else if (v === 5) { const o = (T % 6) / 2 - 1.5; cx.fillStyle = '#062a30'; cx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); cx.strokeStyle = '#00f3ff'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(px + 5, py + 13 + o); cx.lineTo(px + 10, py + 6 + o); cx.lineTo(px + 15, py + 13 + o); cx.stroke(); cx.lineWidth = 1; }
    else if (v === 7) { cx.fillStyle = '#7a5a00'; cx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); cx.strokeStyle = '#f1c40f'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(px + 2, py + 18); cx.lineTo(px + 18, py + 2); cx.moveTo(px + 2, py + 10); cx.lineTo(px + 10, py + 2); cx.stroke(); cx.lineWidth = 1; }
    else { cx.fillStyle = '#b266ff'; cx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); }
  }));
}
const chatBar = () => $('chat-bar');
function openChat(on) {
  const b = chatBar();
  const next = on === undefined ? !b.classList.contains('open') : !!on;
  b.classList.toggle('open', next);
  if (next) { communicationPause.open('chat'); $('gc-in').focus(); }
  else { communicationPause.close('chat'); $('gc-in').blur(); }
}
function sendChat(text, emo) { text = (text || '').trim(); if (!room || (!text && !emo)) return; socket.emit('chat', { text, emo, ai: /^@ai\b/i.test(text) }); }
$('chat-btn').onclick = () => openChat();
$('gc-send').onclick = () => { sendChat($('gc-in').value); $('gc-in').value = ''; };
$('gc-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('gc-send').click(); } else if (e.key === 'Escape') { e.stopPropagation(); openChat(false); } });
EMOTES.forEach(em => { const b = document.createElement('button'); b.type = 'button'; b.textContent = em; b.onclick = () => sendChat('', em); $('emotes').appendChild(b); });
addEventListener('keydown', e => { if (e.key === 'Enter' && !typing(e) && room && !document.querySelector('#screen-lobby.active')) { e.preventDefault(); openChat(true); } });
setInterval(() => { $('chat-btn').style.display = room ? 'block' : 'none'; if (!room) { openChat(false); if ($('ai-box').classList.contains('open')) $('ai-toggle').click(); } }, 500);
$('b-bet') && ($('b-bet').onclick = () => socket.emit('bet', { target: $('bet-target').value, amount: +$('bet-amt').value || 10 }));
$('chat-send') && ($('chat-send').onclick = () => { sendChat($('chat-in').value); $('chat-in').value = ''; });
$('chat-in') && $('chat-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('chat-send').click(); } });

// ---- AI referee button: opens the panel; asks for a token when none is configured ----
(function aiBox() {
  function init() {
    const box = $('ai-box'); if (!box) return;
    const icon = $('ai-icon'); if (icon) icon.onerror = () => { icon.onerror = () => { icon.src = 'made-by.png'; }; icon.src = '/ai/logo.png'; };
    const JSONH = { 'Content-Type': 'application/json' }, modal = $('ai-modal'), hist = [];
    let info = { hasKey: false };
    async function status() {
      try { info = await fetch('/ai/status').then(r => r.json()); } catch (e) { info = { hasKey: false }; }
      const active = !!info.active;
      const label = info.provider ? info.provider + (info.model ? ' · ' + info.model : '') : 'local';
      if ($('ai-provider') && info.provider) $('ai-provider').value = info.provider;
      $('ai-chip').textContent = active ? t('aiOn').replace('{0}', label) : t('aiLocal');
      $('ai-chip').classList.toggle('on', active);
      $('ai-pin').style.display = info.pinRequired ? '' : 'none';
      $('ai-remove').style.display = info.hasKey && info.source === 'saved' ? '' : 'none';
      return info;
    }
    function openModal(msg) { communicationPause.open('ai-modal'); $('ai-msg').textContent = msg || ''; $('ai-token').value = ''; modal.classList.add('open'); setTimeout(() => $('ai-token').focus(), 50); }
    const closeModal = () => { modal.classList.remove('open'); communicationPause.close('ai-modal'); };
    async function save() {
      const provider = ($('ai-provider').value || 'auto').trim();
      const model = $('ai-model').value.trim();
      const key = $('ai-token').value.trim();
      const baseUrl = $('ai-base-url').value.trim();
      const localProvider = ['ollama','lmstudio','local'].includes(provider);
      if (!localProvider && key.length < 8) { $('ai-msg').textContent = t('aiTooShort'); return; }
      $('ai-msg').textContent = t('aiTesting');
      let r, j = {};
      try { r = await fetch('/ai/key', { method: 'POST', headers: JSONH, body: JSON.stringify({ key, provider, model, baseUrl, pin: $('ai-pin').value }) }); j = await r.json().catch(() => ({})); }
      catch (e) { $('ai-msg').textContent = t('aiOffline'); return; }
      if (!r.ok) { $('ai-msg').textContent = j.error || t('aiBad'); return; }
      $('ai-token').value = '';
      const test = await fetch('/ai/chat', { method: 'POST', headers: JSONH, body: JSON.stringify({ message: 'Reply with one short word: ready', ctx: { code: room && room.code } }) }).then(x => x.json()).catch(() => null);
      if (test && test.keyError) { await fetch('/ai/key/clear', { method: 'POST', headers: JSONH, body: JSON.stringify({ pin: $('ai-pin').value }) }).catch(() => {}); await status(); $('ai-msg').textContent = t('aiBad') + (test.note ? ' — ' + test.note.slice(0, 120) : ''); return; }
      await status();
      if (test && test.provider !== 'local-referee') { $('ai-msg').textContent = t('aiSaved'); addLog('ai-log', '🤖 ' + (test.text || '')); setTimeout(closeModal, 900); }
      else $('ai-msg').textContent = t('aiBad') + (test && test.note ? ' — ' + test.note.slice(0, 120) : '');
    }
    async function ask() {
      const inp = $('ai-in'), msg = (inp.value || '').trim(); if (!msg) return; inp.value = ''; addLog('ai-log', '👤 ' + msg);
      try {
        const d = await fetch('/ai/chat', { method: 'POST', headers: JSONH, body: JSON.stringify({ message: msg, history: hist.slice(-8), ctx: { code: room && room.code } }) }).then(r => r.json());
        addLog('ai-log', '🤖 ' + (d.text || '')); toast(d.text || 'AI'); hist.push({ role: 'user', content: msg }, { role: 'assistant', content: d.text || '' });
        if (d.needKey && !modal.classList.contains('open')) { await status(); openModal(t('aiNeedKey')); }
      } catch (e) { toast(t('aiOffline')); }
    }
    $('ai-toggle').onclick = async () => {
      await status(); const opening = !box.classList.contains('open'); box.classList.toggle('open');
      if (opening) communicationPause.open('ai'); else communicationPause.close('ai');
      if (opening && !info.active) openModal(t('aiNeedKey'));
    };
    $('ai-key-btn').onclick = async () => { await status(); openModal(''); };
    $('ai-save').onclick = save; $('ai-cancel').onclick = closeModal;
    $('ai-remove').onclick = async () => { await fetch('/ai/key/clear', { method: 'POST', headers: JSONH, body: JSON.stringify({ pin: $('ai-pin').value }) }).catch(() => {}); await status(); closeModal(); };
    $('ai-token').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    modal.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeModal(); } });
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    $('ai-send').onclick = ask; $('ai-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ask(); } });
    status();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();   // works whatever the script order
})();
