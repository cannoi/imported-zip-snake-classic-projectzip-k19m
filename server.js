'use strict';
const express = require('express'), http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { Server } = require('socket.io');
const PORT = +process.env.PORT || 8080, TICK_RATE = +process.env.TICK_RATE || 20;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data'), MAX_PLAYERS = +process.env.MAX_PLAYERS || 8;
const W = 30, MODES = ['coop', 'survival', 'timeattack', 'levels'], MAPS = ['open', 'box', 'maze', 'portal', 'plus', 'ring', 'lanes', 'islands', 'spiral', 'diamond', 'forest', 'corners', 'checker', 'twin', 'spikes', 'mudflats', 'turbo', 'gates', 'snowflake', 'bridges', 'pinball', 'zigzag', 'octagon', 'volcano', 'random'];
const SKINS = ['solid', 'stripes', 'glow', 'rainbow', 'gradient', 'dots'];
const LEVELS = [
  { map: 'open', name: 'Open Field' },
  { map: 'box', name: 'The Box' },
  { map: 'mudflats', name: 'Mud Flats' },
  { map: 'portal', name: 'Portal Gate' },
  { map: 'spikes', name: 'Spike Field' },
  { map: 'maze', name: 'Labyrinth' },
  { map: 'plus', name: 'Crossroads' },
  { map: 'turbo', name: 'Turbo Track' },
  { map: 'ring', name: 'The Arena' },
  { map: 'gates', name: 'Clockwork Gates' },
  { map: 'lanes', name: 'Highway' },
  { map: 'islands', name: 'Islands' },
  { map: 'zigzag', name: 'Zigzag Hall' },
  { map: 'spiral', name: 'Spiral Pit' },
  { map: 'bridges', name: 'Spike River' },
  { map: 'diamond', name: 'Diamond' },
  { map: 'forest', name: 'Pixel Forest' },
  { map: 'pinball', name: 'Pinball' },
  { map: 'corners', name: 'Four Corners' },
  { map: 'snowflake', name: 'Snowflake' },
  { map: 'checker', name: 'Checkers' },
  { map: 'twin', name: 'Twin Halls' },
  { map: 'octagon', name: 'Octagon' },
  { map: 'maze', name: 'Deep Maze' },
  { map: 'portal', name: 'Warp Storm' },
  { map: 'ring', name: 'Colosseum' },
  { map: 'forest', name: 'Night Grove' },
  { map: 'spiral', name: 'Inner Coil' },
  { map: 'plus', name: 'Final Cross' },
  { map: 'volcano', name: 'Volcano' }
];
const LEVEL_MAPS = LEVELS.map(l => l.map);
const BASE = { easy: 6, normal: 4, fast: 3 }, BOT_COLORS = ['#ff7a00', '#b266ff', '#00f3ff', '#ff007f', '#ffea00'];
const GRACE_MS = +process.env.GRACE_MS || 60000, MAX_ROOMS = +process.env.MAX_ROOMS || 50;   // PORT = internal container port only; the public host port is assigned by SoloHost
const PUBLIC_URL = process.env.PUBLIC_URL || ''; let botSeq = 0;
const isCoop = r => r.mode === 'coop' || r.mode === 'levels';
const solid = v => v === 1 || v === 3 || v === 7;   // 1 wall · 3 spikes · 7 closed gate (2 portal · 4 mud · 5 boost pad are passable)
const SP = [[5, 5, 1, 0], [24, 5, -1, 0], [5, 24, 1, 0], [24, 24, -1, 0], [15, 4, 0, 1], [15, 25, 0, -1], [4, 15, 1, 0], [25, 15, -1, 0]];
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---- persistence (volume /app/data) ----
let scores = {};
try { scores = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'scores.json'), 'utf8')); } catch (e) {}
function saveScore(mode, v) {
  if (v <= (scores[mode] || 0)) return;
  scores[mode] = v;
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(path.join(DATA_DIR, 'scores.json'), JSON.stringify(scores)); } catch (e) { console.error('save failed', e.message); }
}

// ---- maps (matrix g[y][x]: 0 empty, 1 wall, 2 portal) ----
function makeMap(name) {
  const g = Array.from({ length: W }, () => Array(W).fill(0)); let wrap = true, portals = [], gates = [];
  const B = () => { wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1; };
  const rect = (x0, y0, x1, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < W && x >= 0 && x < W) g[y][x] = v; };
  if (name === 'box' || name === 'maze') { wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1; }
  if (name === 'maze') for (let x = 7; x < W - 4; x += 6) for (let y = 2; y < W - 2; y++) if ((y + x * 2) % 9 > 1) g[y][x] = 1;
  if (name === 'plus') {
    wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1;
    for (let i = 8; i < 22; i++) { g[14][i] = g[15][i] = 1; g[i][14] = g[i][15] = 1; }
  }
  if (name === 'ring') {
    wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1;
    for (let i = 10; i < 20; i++) { g[10][i] = g[19][i] = 1; g[i][10] = g[i][19] = 1; }
  }
  if (name === 'lanes') {
    wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1;
    for (let y = 8; y < 23; y += 7) for (let x = 4; x < 26; x++) if (x < 12 || x > 17) g[y][x] = 1;
  }
  if (name === 'islands') {
    for (const [cx, cy] of [[8, 8], [21, 8], [8, 21], [21, 21]])
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) g[y][x] = 1;
  }
  if (name === 'spiral') {
    wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1;
    for (let k = 4; k <= 12; k += 4) for (let i = k; i < W - k; i++) { g[k][i] = 1; g[W - 1 - k][i] = 1; g[i][k] = 1; g[i][W - 1 - k] = 1; }
    for (let k = 4; k <= 8; k += 4) g[k + 1][k] = 0;
  }
  if (name === 'diamond') {
    wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (Math.abs(x - 14) + Math.abs(y - 14) === 9) g[y][x] = 1;
  }
  if (name === 'forest') {
    for (let y = 3; y < W - 3; y += 4) for (let x = 3; x < W - 3; x += 5) { g[y][x] = 1; g[y][x + 1] = 1; }
  }
  if (name === 'corners') {
    wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      g[2 + i][2 + j] = g[2 + i][W - 8 + j] = g[W - 8 + i][2 + j] = g[W - 8 + i][W - 8 + j] = 1;
    }
  }
  if (name === 'checker') {
    wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1;
    for (let y = 4; y < W - 4; y += 4) for (let x = 4; x < W - 4; x += 4) if ((x + y) % 8 === 0) g[y][x] = g[y][x + 1] = g[y + 1][x] = 1;
  }
  if (name === 'twin') {
    wrap = false; for (let i = 0; i < W; i++) g[0][i] = g[W - 1][i] = g[i][0] = g[i][W - 1] = 1;
    for (let y = 2; y < W - 2; y++) if (y < 12 || y > 17) g[y][14] = g[y][15] = 1;
  }

  // ---- v2.7 maps: 3 spikes (deadly) · 4 mud (slows) · 5 boost pad · 7 closed gate (opens/closes every 4s)
  if (name === 'spikes') { for (let y = 3; y < W - 3; y += 3) for (let x = 3; x < W - 3; x += 3) if (((x + y) / 3) % 2 === 0) g[y][x] = 3; }
  if (name === 'mudflats') { B(); [[6, 6], [18, 6], [6, 18], [18, 18], [12, 12]].forEach(([x, y]) => rect(x, y, x + 5, y + 5, 4)); }
  if (name === 'turbo') { B(); rect(9, 9, 20, 20, 1); for (let k = 7; k <= 22; k += 5) { g[4][k] = 5; g[25][k] = 5; g[k][4] = 5; g[k][25] = 5; } }
  if (name === 'gates') { B(); rect(10, 1, 10, 28, 1); rect(19, 1, 19, 28, 1); [[10, 6, 8], [10, 21, 23], [19, 13, 16]].forEach(([x, a, b]) => { for (let y = a; y <= b; y++) { g[y][x] = 0; gates.push([x, y]); } }); }
  if (name === 'snowflake') { B(); for (let i = 6; i < 24; i++) if (i % 3) { g[i][i] = 1; g[i][W - 1 - i] = 1; } rect(13, 13, 16, 16, 4); }
  if (name === 'bridges') { B(); rect(1, 13, 28, 16, 3); [[3, 8], [14, 15], [21, 26]].forEach(([a, b]) => rect(a, 13, b, 16, 0)); }
  if (name === 'pinball') { [[7, 7], [21, 7], [7, 21], [21, 21], [14, 14]].forEach(([x, y]) => rect(x, y, x + 1, y + 1, 1)); [[14, 8], [14, 21], [8, 14], [21, 14]].forEach(([x, y]) => { g[y][x] = 5; }); }
  if (name === 'zigzag') { B(); [[6, 1, 24], [11, 5, 28], [16, 1, 24], [21, 5, 28]].forEach(([y, a, b]) => rect(a, y, b, y, 1)); }
  if (name === 'octagon') { B(); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (Math.min(x, W - 1 - x) + Math.min(y, W - 1 - y) < 9) g[y][x] = 1; rect(13, 13, 16, 16, 3); }
  if (name === 'volcano') { B(); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - 14.5, y - 14.5) < 4.5) g[y][x] = 3; [[14, 6], [14, 23], [6, 14], [23, 14], [8, 8], [21, 8], [8, 21], [21, 21]].forEach(([x, y]) => { g[y][x] = 5; }); }
  for (const [sx, sy] of SP) for (let y = sy - 2; y <= sy + 2; y++) for (let x = sx - 2; x <= sx + 2; x++) if (x > 0 && y > 0 && x < W - 1 && y < W - 1) g[y][x] = 0;
  if (name === 'portal') portals = [[[8, 15], [21, 15]], [[15, 8], [15, 21]]];
  if (name === 'pinball') portals = [[[10, 4], [19, 25]]];
  portals.forEach(p => p.forEach(([x, y]) => g[y][x] = 2));
  // reach[y][x]: cells a snake can really get to (food/walls never spawn in sealed pockets such as the inside of a closed ring)
  const pair = new Map(); portals.forEach(([a, b]) => { pair.set(a[0] + ',' + a[1], b); pair.set(b[0] + ',' + b[1], a); });
  const reach = Array.from({ length: W }, () => Array(W).fill(false)), q = [[SP[0][0], SP[0][1]]]; reach[SP[0][1]][SP[0][0]] = true;
  while (q.length) {
    const [x, y] = q.pop(), nx = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]], pr = pair.get(x + ',' + y); if (pr) nx.push(pr);
    for (let [a, b] of nx) { if (wrap) { a = (a + W) % W; b = (b + W) % W; } if (a < 0 || b < 0 || a >= W || b >= W || reach[b][a] || solid(g[b][a])) continue; reach[b][a] = true; q.push([a, b]); }
  }
  return { g, wrap, portals, gates, reach };
}

// ---- rooms ----
const rooms = new Map();
const clean = p => ({
  name: String((p && p.name) || 'Player').replace(/[<>&"]/g, '').slice(0, 12) || 'Player',
  color: /^#[0-9a-f]{6}$/i.test(p && p.color) ? p.color : '#39ff14',
  skin: SKINS.includes(p && p.skin) ? p.skin : 'solid'
});
function newCode() { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join(''); } while (rooms.has(c)); return c; }
const occupied = (r, x, y) => r.map.g[y][x] !== 0 || r.foods.some(f => f.x === x && f.y === y) ||
  [...r.players.values()].some(p => p.alive && p.body.some(b => b[0] === x && b[1] === y));
function freeCell(r) { for (let i = 0; i < 200; i++) { const x = Math.random() * W | 0, y = Math.random() * W | 0; if (r.map.reach[y][x] && !occupied(r, x, y)) return [x, y]; } return null; }
function spawnFood(r) {
  const c = freeCell(r); if (!c) return;
  const roll = Math.random(), t = roll < .7 ? 'n' : roll < .82 ? 'x2' : roll < .92 ? 'sp' : 'fz';
  r.foods.push({ x: c[0], y: c[1], t });
}
function spawnSnake(r, p) {
  const [x, y, dx, dy] = SP[p.slot % SP.length];
  p.body = [[x, y], [x - dx, y - dy], [x - 2 * dx, y - 2 * dy]].map(b => [(b[0] + W) % W, (b[1] + W) % W]);
  p.dir = p.nd = [dx, dy]; p.alive = true; p.cd = 1; p.grow = 0; p.speed = 0; p.respawnAt = 0;
}
const levelMeta = r => LEVELS[(Math.max(1, r.level) - 1) % LEVELS.length];
const RANDOM_POOL = MAPS.filter(m => m !== 'random');
const curMapName = r => r.mode === 'levels' ? levelMeta(r).map : r.mapName === 'random' ? (r.rndMap || (r.rndMap = RANDOM_POOL[Math.random() * RANDOM_POOL.length | 0])) : r.mapName;
const startMsg = r => ({ mode: r.mode, level: r.level, ln: r.mode === 'levels' ? levelMeta(r).name : curMapName(r), map: { g: r.map.g, wrap: r.map.wrap, gates: r.map.gates, name: curMapName(r) }, w: W });
function loadLevel(r) {
  r.map = makeMap(curMapName(r)); r.foods = [];
  let i = 0; for (const p of r.players.values()) { p.slot = i++; spawnSnake(r, p); }
  for (let k = 0; k < 3; k++) spawnFood(r);
  r.hold = r.tick + TICK_RATE * (r.level > 1 ? 2 : 3);
  io.to(r.code).emit('start', startMsg(r));
  refSay(r, r.mode === 'levels' ? ('Stage ' + r.level + ': ' + levelMeta(r).name) : ('Match start · ' + r.mode));
}
function startGame(r) {
  r.rndMap = null; r.tick = 0; r.phase = 'playing'; r.lives = 3; r.team = 0; r.level = 1; r.target = 100;
  r.freezeUntil = 0; r.freezer = null; r.endTick = r.mode === 'timeattack' ? TICK_RATE * 93 : 0; r.paused = false;
  for (const p of r.players.values()) p.score = 0;
  loadLevel(r);
}
// ---- bot AI: tránh va chạm, ưu tiên mồi gần nhất ----
function safe(r, p, x, y) {
  if (r.map.wrap) { x = (x + W) % W; y = (y + W) % W; }
  if (x < 0 || y < 0 || x >= W || y >= W || solid(r.map.g[y][x])) return false;
  for (const q of r.players.values()) if (q.alive && (q === p || !isCoop(r)) && q.body.some(b => b[0] === x && b[1] === y)) return false;
  return true;
}
function think(r, p) {
  const h = p.body[0], f = r.foods.reduce((m, o) => !m || Math.abs(o.x - h[0]) + Math.abs(o.y - h[1]) < Math.abs(m.x - h[0]) + Math.abs(m.y - h[1]) ? o : m, null);
  let best = null;
  for (const v of Object.values(DIRS)) {
    if (v[0] + p.dir[0] === 0 && v[1] + p.dir[1] === 0) continue;
    const x = h[0] + v[0], y = h[1] + v[1]; if (!safe(r, p, x, y)) continue;
    const sc = (f ? -(Math.abs(f.x - x) + Math.abs(f.y - y)) : 0) + Math.random() * .7;
    if (!best || sc > best.sc) best = { v, sc };
  }
  if (best) p.nd = best.v;
}
function die(r, p) {
  p.alive = false; p.respawnAt = r.tick + TICK_RATE * 3;
  if (isCoop(r)) r.lives--;
  if (!p.bot) refSay(r, p.name + ' out' + (isCoop(r) ? (' · lives ' + r.lives) : ''));
}
function step(r, p) {
  p.dir = p.nd; let [x, y] = [p.body[0][0] + p.dir[0], p.body[0][1] + p.dir[1]];
  if (r.map.wrap) { x = (x + W) % W; y = (y + W) % W; }
  if (x < 0 || y < 0 || x >= W || y >= W || solid(r.map.g[y][x])) return die(r, p);
  if (r.map.g[y][x] === 2) for (const [a, b] of r.map.portals) {
    const to = a[0] === x && a[1] === y ? b : b[0] === x && b[1] === y ? a : null;
    if (to) { x = (to[0] + p.dir[0] + W) % W; y = (to[1] + p.dir[1] + W) % W; break; }
  }
  p.body.unshift([x, y]);
  if (p.grow > 0) p.grow--; else p.body.pop();
  const tile = r.map.g[y][x]; if (tile === 4) p.cd += 2; else if (tile === 5) p.speed = Math.max(p.speed, TICK_RATE * 2);   // mud slows · boost pad speeds up
  const fi = r.foods.findIndex(f => f.x === x && f.y === y);
  if (fi >= 0) {
    const f = r.foods.splice(fi, 1)[0]; let pts = 10; p.grow += 1;
    if (f.t === 'x2') { pts = 20; p.grow += 1; }
    if (f.t === 'sp') p.speed = TICK_RATE * 8;
    if (f.t === 'fz') { r.freezeUntil = r.tick + TICK_RATE * 4; r.freezer = p.id; }
    p.score += pts; if (isCoop(r)) r.team += pts;
    spawnFood(r); if (r.foods.length < 3) spawnFood(r);
    if (r.mode === 'levels' && r.team >= r.target) { r.level++; r.target += 100 + r.level * 20; loadLevel(r); }
  }
}
function update(r) {
  if (r.paused) return snapshot(r);
  r.tick++; if (r.tick < r.hold) return snapshot(r);   // đếm ngược 3-2-1
  const moved = [], ps = [...r.players.values()];
  for (const p of ps) {
    if (!p.alive) { if (p.respawnAt && r.tick >= p.respawnAt && r.mode !== 'survival' && !(isCoop(r) && r.lives <= 0)) spawnSnake(r, p); continue; }
    if (p.speed > 0) p.speed--;
    if ((p.bot || p.off) && p.cd <= 1) think(r, p);   // bot hoặc người chơi đang mất kết nối: AI lái tạm
    if (--p.cd > 0) continue;
    const base = Math.max(2, BASE[r.diff] - (r.mode === 'levels' ? Math.floor((r.level - 1) / 2) : 0));
    p.cd = (r.freezeUntil > r.tick && r.freezer !== p.id) ? base * 2 : p.speed > 0 ? Math.max(1, base - 2) : base;
    step(r, p); if (p.alive) moved.push(p);
  }
  for (const p of moved) {                       // collisions
    const h = p.body[0]; let hit = false;
    for (const q of ps) {
      if (!q.alive || (q !== p && isCoop(r))) continue;
      for (let i = q === p ? 1 : 0; i < q.body.length; i++) if (q.body[i][0] === h[0] && q.body[i][1] === h[1]) { hit = true; break; }
      if (hit) break;
    }
    if (hit) p._dead = true;
  }
  for (const p of moved) if (p._dead) { p._dead = false; die(r, p); }
  if (r.map.gates && r.map.gates.length && r.tick % (TICK_RATE * 4) === 0) {   // Clockwork Gates: toggle every 4s (never closes on a snake)
    r.map.gateClosed = !r.map.gateClosed;
    for (const [gx, gy] of r.map.gates) { if (r.map.gateClosed && ps.some(p => p.alive && p.body.some(b => b[0] === gx && b[1] === gy))) continue; r.map.g[gy][gx] = r.map.gateClosed ? 7 : 0; }
    io.to(r.code).emit('map', r.map.g);
  }
  if (r.mode === 'survival' && r.tick % (TICK_RATE * 10) === 0) for (let i = 0; i < 3; i++) { const c = freeCell(r); if (c) r.map.g[c[1]][c[0]] = 1; }
  if (r.mode === 'survival' && r.tick % (TICK_RATE * 10) === 0) io.to(r.code).emit('map', r.map.g);
  const alive = ps.filter(p => p.alive).length;
  if ((isCoop(r) && r.lives <= 0) || (r.mode === 'survival' && alive <= (ps.length > 1 ? 1 : 0)) || (r.endTick && r.tick >= r.endTick)) return finish(r);
  snapshot(r);
}
function snapshot(r) {
  const ps = [...r.players.values()];
  io.to(r.code).emit('s', {
    t: r.tick, lv: r.level, ln: r.mode === 'levels' ? levelMeta(r).name : curMapName(r), tg: r.target, life: r.lives, team: r.team, left: r.endTick ? Math.max(0, Math.min(90, Math.ceil((r.endTick - r.tick) / TICK_RATE))) : null,
    h: r.hold > r.tick ? Math.ceil((r.hold - r.tick) / TICK_RATE) : 0, ps: r.paused ? 1 : 0, gw: (r.map && r.map.gates && r.map.gates.length && !r.map.gateClosed && r.tick % (TICK_RATE * 4) >= TICK_RATE * 3) ? 1 : 0,
    fz: r.freezeUntil > r.tick ? r.freezer : null, foods: r.foods.map(f => [f.x, f.y, f.t]),
    p: ps.map(p => ({ id: p.id, n: p.name, c: p.color, k: p.skin, a: p.alive, sc: p.score, sp: p.speed > 0, b: p.body }))
  });
}

function refSay(r, text) {
  if (!r) return;
  r.refLog = r.refLog || [];
  r.refLog.push({ t: Date.now(), text: String(text).slice(0, 180) });
  if (r.refLog.length > 50) r.refLog.shift();
  io.to(r.code).emit('ref', { text: String(text).slice(0, 180) });
}
function settleBets(r, winnerId) {
  const bets = r.bets || [];
  r.bets = [];
  if (!bets.length) return [];
  const hits = bets.filter(b => b.target === winnerId);
  const pot = bets.reduce((s, b) => s + b.amount, 0);
  const house = Math.floor(pot * 0.05);
  const pool = pot - house;
  const out = [];
  if (hits.length) {
    const share = Math.floor(pool / hits.length);
    for (const b of hits) {
      const p = r.players.get(b.from);
      if (p) { p.chips = (p.chips || 0) + share; out.push({ n: p.name, win: share }); }
    }
    refSay(r, '🤖 House kept ' + house + ' · winners share ' + pool);
  } else {
    refSay(r, '🤖 No winning ticket · pot ' + pot + ' stays with the house');
  }
  return out;
}
function finish(r) {
  r.phase = 'over'; const ps = [...r.players.values()].sort((a, b) => b.score - a.score);
  const best = isCoop(r) ? r.team : (ps[0] ? ps[0].score : 0); saveScore(r.mode, best);
  const payouts = settleBets(r, ps[0] && ps[0].id);
  io.to(r.code).emit('over', { mode: r.mode, level: r.level, team: r.team, best: scores[r.mode] || 0, results: ps.map(p => ({ n: p.name, c: p.color, sc: p.score, a: p.alive, chips: p.chips })), payouts });
  const top = ps[0]; refSay(r, top ? ('🏆 ' + top.name + ' — ' + (isCoop(r) ? ('team ' + r.team) : top.score)) : 'Game over');
  lobby(r);
}
function lobby(r) {
  io.to(r.code).emit('lobby', { code: r.code, host: r.host, mode: r.mode, map: r.mapName, diff: r.diff, url: hostInfo().publicUrl, lan: hostInfo().lanUrls, phase: r.phase, scores,
    players: [...r.players.values()].map(p => ({ id: p.id, name: p.name, color: p.color, skin: p.skin, bot: !!p.bot, off: !!p.off, chips: p.chips|0 })), aiChat: r.aiChat !== false, levels: r.mode === 'levels' ? LEVELS.map(l => [l.map, l.name]) : undefined });
}

// ---- server ----
const app = express(), srv = http.createServer(app), io = new Server(srv, { pingInterval: 5000, pingTimeout: 8000, cors: { origin: true } });
app.use(express.json({ limit: '200kb' }));
app.use(express.static('public'));
const APP_VERSION = (() => { try { return require('./package.json').version || '0.0.0'; } catch (e) { return '0.0.0'; } })();
// SoloHost Feedback Hub: built-in defaults (no .env needed); SHFH_* env variables override them.
// The ingest token is a *client* token by design of the Hub SDK: any browser that opens the game can see it. Rotate it on the Hub if abused.
let publicIp = '';
let advertisedPort = '';   // last public/host port seen on a real request (SoloHost), NEVER the internal container PORT
const APP_ID = process.env.SHFH_APP_ID || process.env.APP_ID || 'imported-zip-snake-classic-projectzip-k19m';
function lanIps() {
  return Object.values(os.networkInterfaces()).flat().filter(i => i && (i.family === 'IPv4' || i.family === 4) && !i.internal).map(i => i.address);
}
function rememberPublicPort(headers) {
  if (!headers) return advertisedPort;
  const get = k => {
    if (typeof headers.get === 'function') return headers.get(k) || headers.get(k.toLowerCase()) || '';
    return headers[k] || headers[k.toLowerCase()] || '';
  };
  const xf = String(get('x-forwarded-port') || '').split(',')[0].trim();
  const host = String(get('x-forwarded-host') || get('host') || '').split(',')[0].trim();
  const fromHost = (host.match(/:(\d+)$/) || [])[1] || '';
  const p = xf || fromHost;
  if (p) advertisedPort = p;
  return advertisedPort;
}
function hostInfo(req) {
  const ips = lanIps();
  if (req) rememberPublicPort(req);
  const host = req ? String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim() : '';
  const port = advertisedPort;   // SoloHost-assigned public port only; do not fall back to internal 8080
  const proto = req ? String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim() : 'http';
  const reqUrl = host && !/^(localhost|127\.)/.test(host) ? proto + '://' + host : '';
  const publicUrl = PUBLIC_URL || reqUrl || ((publicIp && port) ? ('http://' + publicIp + ':' + port) : '');
  const lanUrls = port ? ips.map(ip => 'http://' + ip + ':' + port) : [];
  const urls = [];
  if (publicUrl) urls.push(publicUrl);
  lanUrls.forEach(u => { if (!urls.includes(u)) urls.push(u); });
  if (reqUrl && !urls.includes(reqUrl)) urls.push(reqUrl);
  return { port: PORT, hostPort: port ? +port : null, publicIp, publicUrl, lanUrls, ips, urls, url: publicUrl, appId: APP_ID };
}
async function refreshPublicIp() {
  for (const u of ['https://api.ipify.org', 'https://ipv4.icanhazip.com', 'https://ifconfig.me/ip']) {
    try {
      const t = await fetch(u, { signal: AbortSignal.timeout(2500) }).then(r => r.text());
      const ip = String(t || '').trim();
      if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip) && ip !== publicIp) {
        publicIp = ip;
        if (typeof io !== 'undefined') io.emit('hosts', hostInfo());
      }
      if (publicIp) return;
    } catch (e) {}
  }
}
setInterval(refreshPublicIp, 45000);
refreshPublicIp();
app.get('/api/info', (q, res) => res.json(hostInfo(q)));
app.get('/health', (q, s) => s.status(200).send('OK'));
const adapter = require('./lib/app-adapter');
const { createAIService } = require('./ai-module/server/ai-service');
const { mountAIRoutes } = require('./ai-module/server/routes');
const { createFeedbackService, mountFeedbackRoutes } = require('./feedback-module/server/feedback-service');
const ai = createAIService({ dataDir: require('path').join(__dirname, 'data'), appName: 'Snake Arcade', adapter });
mountAIRoutes(app, ai);
const fbOpts = { appId: 'snake-arcade', appName: 'Snake Arcade', version: APP_VERSION };
if (process.env.SHFH_HUB_ID) fbOpts.hubId = process.env.SHFH_HUB_ID;
if (process.env.SHFH_HUB_URL) fbOpts.baseUrl = process.env.SHFH_HUB_URL;
if (process.env.SHFH_INGEST_TOKEN) fbOpts.ingestToken = process.env.SHFH_INGEST_TOKEN;
const fb = createFeedbackService(fbOpts);
mountFeedbackRoutes(app, fb);

const humansOf = room => [...room.players.values()].filter(p => !p.bot);
function rehost(room) { const on = humansOf(room).filter(p => !p.off); if (on.length && !on.some(p => p.id === room.host)) room.host = on[0].id; }
const newPlayer = (id, prof) => ({ id, ...clean(prof), sock: null, off: 0, alive: false, body: [], score: 0, chips: 100, slot: 0, dir: [1, 0], nd: [1, 0], cd: 1, grow: 0, speed: 0, respawnAt: 0 });

io.on('connection', sock => {
  rememberPublicPort(sock.handshake && sock.handshake.headers);
  let r = null, pid = null, bucket = { n: 0, t: Date.now() };
  const ok = max => { const now = Date.now(); if (now - bucket.t > 1000) bucket = { n: 0, t: now }; return ++bucket.n <= max; };  // giới hạn tốc độ
  const fn = cb => typeof cb === 'function' ? cb : () => {};
  const me = () => r && r.players.get(pid);
  const enter = (room, prof, id) => {                       // vào mới HOẶC nối lại theo pid (không mất rắn/điểm)
    r = room; pid = id; sock.join(r.code);
    let p = r.players.get(pid);
    if (p) { p.sock = sock.id; p.off = 0; if (prof) Object.assign(p, clean(prof)); }
    else {
      p = newPlayer(pid, prof); p.sock = sock.id; r.players.set(pid, p);
      if (r.phase === 'playing') { p.slot = r.players.size - 1; p.respawnAt = r.tick + TICK_RATE * 2; }   // vào giữa ván
    }
    if (humansOf(r).length > 1) r.paused = false;
    rehost(r); if (r.phase === 'playing') sock.emit('start', startMsg(r)); lobby(r);
    sock.emit('chat-log', (r.chat || []).slice(-20));
  };
  const leave = () => {
    if (!r) return; const room = r; room.players.delete(pid); sock.leave(room.code); r = null;
    if (!humansOf(room).length) rooms.delete(room.code); else { rehost(room); lobby(room); }
  };
  const pidOf = d => (d && /^[a-z0-9]{6,40}$/i.test(d.pid)) ? d.pid : sock.id;
  sock.on('create', (d, cb) => {
    cb = fn(cb); if (!ok(10)) return cb({ ok: false, err: 'Thao tác quá nhanh' });
    if (rooms.size >= MAX_ROOMS) return cb({ ok: false, err: 'Server đã đầy phòng' });
    leave(); const code = newCode();
    const room = { code, host: null, players: new Map(), mode: 'coop', mapName: 'open', diff: 'normal', level: 1, phase: 'lobby', foods: [], tick: 0 };
    rooms.set(code, room); enter(room, d && d.profile, pidOf(d)); room.host = pid; lobby(room); cb({ ok: true, code });
  });
  sock.on('join', (d, cb) => {
    cb = fn(cb); if (!ok(10)) return cb({ ok: false, err: 'Thao tác quá nhanh' });
    const room = rooms.get(String((d && d.code) || '').toUpperCase().slice(0, 4)), id = pidOf(d);
    if (!room) return cb({ ok: false, err: 'Không tìm thấy phòng' });
    if (!room.players.has(id) && room.players.size >= MAX_PLAYERS) return cb({ ok: false, err: 'Phòng đã đầy' });
    if (r && r !== room) leave(); enter(room, d.profile, id); cb({ ok: true, code: room.code });
  });
  sock.on('rooms', cb => fn(cb)([...rooms.values()].map(x => ({ code: x.code, mode: x.mode, phase: x.phase, n: humansOf(x).length, max: MAX_PLAYERS, host: (x.players.get(x.host) || {}).name }))));
  sock.on('p', (t, cb) => fn(cb)(t));                       // đo ping
  sock.on('profile', d => { const p = me(); if (p && ok(10)) { Object.assign(p, clean(d)); lobby(r); } });
  sock.on('config', d => {
    if (!r || r.host !== pid || r.phase === 'playing' || !d || !ok(10)) return;
    if (MODES.includes(d.mode)) r.mode = d.mode; if (MAPS.includes(d.map)) r.mapName = d.map; if (BASE[d.diff]) r.diff = d.diff; lobby(r);
  });
  sock.on('start', () => { if (r && r.host === pid && r.phase !== 'playing' && ok(10)) { startGame(r); lobby(r); } });
  sock.on('dir', d => {
    if (!ok(60)) return; const p = me(); const v = DIRS[d]; if (!p || !v || !p.alive) return;
    if (v[0] + p.dir[0] !== 0 || v[1] + p.dir[1] !== 0) p.nd = v;   // không quay đầu 180°
  });
  sock.on('pause', () => { if (r && r.phase === 'playing' && humansOf(r).length === 1 && ok(10)) r.paused = !r.paused; });   // chỉ khi chơi một mình
  sock.on('bot', add => {
    if (!r || r.host !== pid || r.phase === 'playing' || !ok(10)) return;
    if (add) { if (r.players.size >= MAX_PLAYERS) return; const id = 'bot' + (++botSeq);
      r.players.set(id, { ...newPlayer(id, { name: 'Bot ' + botSeq, color: BOT_COLORS[botSeq % 5], skin: SKINS[botSeq % SKINS.length] }), bot: true }); }
    else { const bots = [...r.players.values()].filter(p => p.bot); if (bots.length) r.players.delete(bots.pop().id); }
    lobby(r);
  });
  sock.on('leave', () => leave());
  const EMOTES = ['👍', '😂', '😮', '🔥', '👏', '😭', 'GG']; let lastChat = 0;
  sock.on('chat', d => {                                     // room chat (lobby + in game) · quick emotes · "@ai question" asks the referee
    const p = me(); if (!p || !r || !ok(20)) return; const now = Date.now(); if (now - lastChat < 400) return; lastChat = now;
    const emo = EMOTES.includes(d && d.emo) ? d.emo : '';
    const text = emo && !(d && d.text) ? emo : String((d && d.text) || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 160);
    if (!text) return;
    const msg = { pid: p.id, n: p.name, text, emo, ai: false, t: now };
    r.chat = (r.chat || []).concat(msg).slice(-40); io.to(r.code).emit('chat', msg);
    if (r.aiChat !== false && !emo && aiApi && /^(@ai|\/ai)\b/i.test(text)) {
      if (now - (r.aiAt || 0) < 3000) return sock.emit('chat', { n: 'AI', text: '…', ai: true, wait: true, t: now }); r.aiAt = now;   // cooldown protects the API bill
      const room = r, q = text.replace(/^(@ai|\/ai)\b\s*/i, '') || 'status';
      aiApi.ask(q, { code: room.code }).then(out => {
        const reply = { n: 'AI', text: String(out.text || '').slice(0, 300), ai: true, needKey: !!out.needKey, t: Date.now() };
        room.chat = (room.chat || []).concat(reply).slice(-40); io.to(room.code).emit('chat', reply);
      }).catch(() => {});
    }
  });
  sock.on('bet', d => {
    if (!ok(8) || !r) return; const p = me(); if (!p) return;
    const amount = Math.max(1, Math.min(50, +((d && d.amount) || 10) | 0));
    if ((p.chips || 0) < amount) return sock.emit('chat', { n: 'AI', text: 'Not enough chips', ai: true });
    const targetName = String((d && d.target) || '').slice(0, 12);
    const tgt = [...r.players.values()].find(x => x.name === targetName) || [...r.players.values()].find(x => x.id === (d && d.target));
    if (!tgt) return sock.emit('chat', { n: 'AI', text: 'Pick a player to bet on', ai: true });
    p.chips -= amount; r.bets = r.bets || []; r.bets.push({ from: p.id, target: tgt.id, amount });
    refSay(r, '🎲 ' + p.name + ' bets ' + amount + ' on ' + tgt.name);
    lobby(r);
  });
  sock.on('ai-toggle', on => { if (r && r.host === pid) { r.aiChat = !!on; lobby(r); } });
  sock.on('disconnect', () => {                             // giữ chỗ GRACE_MS để nối lại, AI lái rắn trong lúc đó
    const p = me(); if (!p || p.sock !== sock.id) return;
    p.off = Date.now(); p.sock = null; rehost(r); lobby(r);
  });
});

// dọn người chơi offline quá hạn và phòng trống
setInterval(() => {
  const now = Date.now();
  for (const room of [...rooms.values()]) {
    let changed = false;
    for (const p of humansOf(room)) if (p.off && now - p.off > GRACE_MS) { room.players.delete(p.id); changed = true; }
    if (!humansOf(room).length) rooms.delete(room.code); else if (changed) { rehost(room); lobby(room); }
  }
}, Math.min(5000, GRACE_MS));

setInterval(() => { for (const r of rooms.values()) if (r.phase === 'playing') update(r); }, 1000 / TICK_RATE);
if (require.main === module) {
  srv.listen(PORT, '0.0.0.0', () => console.log(`Snake Arcade on :${PORT} @${TICK_RATE}Hz`));
  process.on('SIGTERM', () => { io.close(); srv.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); });  // docker stop
}
module.exports = { makeMap, MAPS, LEVELS, W, SP };
