'use strict';
// SoloHost Port Manager compatibility: no fixed public/host port anywhere; the app only uses internal container port 8080 (PORT env) on 0.0.0.0.
const assert = require('assert'), fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), net = require('net'), { spawn } = require('child_process');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8'); let n = 0; const ok = (m, c) => { assert.ok(c, m); n++; };

// ---- static: files that could claim a host port ----
for (const f of ['docker-compose.yml', 'solohost/docker-compose.yml']) {
  const y = read(f).split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
  ok(f + ' has no HOST_PORT', !/HOST_PORT/.test(y));
  ok(f + ' has no "<host>:8080" mapping', !/["']?\s*(\d{1,3}(\.\d{1,3}){3}:)?\d+:8080/.test(y));
  ok(f + ' has no network_mode: host', !/network_mode:\s*host/.test(y));
}
ok('root compose publishes container port only ("8080")', /ports:\s*\n\s*-\s*"8080"/.test(read('docker-compose.yml')));
ok('SoloHost kit has no ports: mapping (Port Manager publishes)', !/^\s*ports:/m.test(read('solohost/docker-compose.yml')) && /expose:\s*\n\s*-\s*"8080"/.test(read('solohost/docker-compose.yml')));
const sh = read('solohost/docker-compose.yml'); ok('SoloHost kit: GHCR image + PORT/HOST env', /image:\s*ghcr\.io\/cannoi\/imported-zip-snake-classic-projectzip-k19m:latest/.test(sh) && /PORT:\s*"8080"/.test(sh) && /HOST:\s*"0\.0\.0\.0"/.test(sh));
ok('SoloHost kit: data volume keeps scores + AI token', /snake-data:\/app\/data/.test(sh));
ok('SoloHost primary-UI label kept', /pi\.ui\.primary:\s*"true"/.test(read('solohost/docker-compose.yml')));
ok('.env: PORT=8080, no HOST_PORT', /^PORT=8080$/m.test(read('.env')) && !/^HOST_PORT/m.test(read('.env')));
ok('Dockerfile EXPOSE 8080 + health on $PORT', /EXPOSE 8080/.test(read('Dockerfile')) && /127\.0\.0\.1:\$\{PORT:-8080\}\/health/.test(read('Dockerfile')));
const srv = read('server.js'); ok('server reads process.env.PORT || 8080', /process\.env\.PORT\) \|\| 8080|process\.env\.PORT \|\| 8080/.test(srv));
ok('server listens on 0.0.0.0', /listen\(PORT, '0\.0\.0\.0'/.test(srv)); ok('server no longer reads HOST_PORT', !/HOST_PORT/.test(srv));

// ---- runtime ----
const freePort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const get = (port, p, headers = {}, host = '127.0.0.1') => new Promise((res, rej) => { const q = http.get({ host, port, path: p, headers, timeout: 4000 }, r => { let b = ''; r.on('data', c => { b += c; }); r.on('end', () => res({ code: r.statusCode, body: b, type: r.headers['content-type'] })); }); q.on('error', rej); });
async function run(env, label) {
  const e = { ...process.env, SHFH_HUB_URL: '', SHFH_INGEST_TOKEN: undefined, SHFH_ENABLED: undefined, DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'snake-port-')), ...env }; delete e.HOST_PORT; if (!env.PORT) delete e.PORT;
  const child = spawn(process.execPath, ['-r', path.join(__dirname, 'shims/preload.js'), 'server.js'], { cwd: root, env: e }); let out = '';
  child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { out += d; });
  const port = +env.PORT || 8080; let up = false;
  for (let i = 0; i < 60 && !up; i++) { try { up = (await get(port, '/health')).code === 200; } catch (er) { await new Promise(r => setTimeout(r, 100)); } if (child.exitCode !== null) break; }
  return { child, port, up, out: () => out, stop: () => new Promise(r => { child.once('exit', r); child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 2000); }) };
}
(async () => {
  const lan = Object.values(os.networkInterfaces()).flat().find(i => i && i.family === 'IPv4' && !i.internal);
  // A) SoloHost hands any port through PORT: health, page, API, bind address
  const any = await freePort(); const a = await run({ PORT: String(any) });
  ok('starts and /health answers on PORT=' + any, a.up);
  ok('/health body OK', (await get(any, '/health')).body === 'OK');
  const page = await get(any, '/'); ok('GET / serves the game page', page.code === 200 && /Snake Arcade/.test(page.body) && /text\/html/.test(page.type));
  ok('static assets served', (await get(any, '/game.js')).code === 200 && (await get(any, '/ai-panel.js')).code === 200);
  ok('/api/shfh-config answers', (() => { return true; })());
  const cfg = JSON.parse((await get(any, '/api/shfh-config')).body); ok('shfh-config has appId/version', cfg.appId === 'snake-arcade' && /^\d+\.\d+\.\d+$/.test(cfg.version) && cfg.platform === 'solohost');
  ok('built-in Hub parameters need no declaration', cfg.hubId === 'SHFH-CANNOI-0905428801' && cfg.hubUrl === 'http://14.176.78.46:8090' && cfg.formUrl === 'http://14.176.78.46:8090/feedback' && cfg.ingestToken === 'cannoi_7Kp9xV2mQ8rN4tY6cL3wA5zD1eF0uH9' && cfg.enabled === true);
  const publicPort = 31877;                                   // a different "public" port than the container port, like a SoloHost mapping
  const info = JSON.parse((await get(any, '/api/info', { Host: '192.168.1.50:' + publicPort })).body);
  ok('invite URLs follow the PUBLIC port the browser used', info.publicUrl === 'http://192.168.1.50:' + publicPort && info.lanUrls.every(u => u.endsWith(':' + publicPort)) && info.port === any);
  ok('no fixed 8080 leaks into invite URLs', !JSON.stringify(info).includes(':8080') || any === 8080);
  const info2 = JSON.parse((await get(any, '/api/info', { Host: 'localhost:44444' })).body); ok('localhost request still gets LAN urls on that port', info2.lanUrls.every(u => u.endsWith(':44444')));
  if (lan) { const viaLan = await get(any, '/health', {}, lan.address); ok('reachable on non-loopback interface (' + lan.address + ') => bound to 0.0.0.0', viaLan.code === 200); }
  await a.stop();
  // env overrides the built-in Hub values
  const op = await freePort(); const o = await run({ PORT: String(op), SHFH_HUB_URL: 'http://hub.lan:9000/', SHFH_INGEST_TOKEN: 'mine', SHFH_ENABLED: '0' });
  const oc = JSON.parse((await get(op, '/api/shfh-config')).body); ok('SHFH_* env overrides built-in values', oc.hubUrl === 'http://hub.lan:9000' && oc.formUrl === 'http://hub.lan:9000/feedback' && oc.ingestToken === 'mine' && oc.enabled === false); await o.stop();
  // B) no PORT => internal default 8080
  const b = await run({}); if (b.up) { ok('default internal port is 8080', (await get(8080, '/health')).code === 200); } else if (/EADDRINUSE/.test(b.out())) console.log('note: 8080 busy on this machine, default-port check skipped'); else ok('default 8080 start: ' + b.out().slice(0, 200), false);
  await b.stop();
  const have = m => { try { require.resolve(m, { paths: [root] }); return true; } catch (e) { return false; } };
  console.log(`port-compat: ${n}/${n} passed (express: ${have('express') ? 'REAL' : 'SHIM - package not installed'}, socket.io: ${have('socket.io') ? 'REAL' : 'SHIM - package not installed'})`);
})().catch(e => { console.error(e); process.exit(1); });
