'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

assert.strictEqual(JSON.parse(read('ai-app-kernel/package.json')).version, '1.1.1');
for (const f of ['router.js', 'brand.js', 'selftest.js']) assert.ok(fs.existsSync(path.join(root, 'ai-app-kernel/src', f)), f);
assert.ok(fs.existsSync(path.join(root, 'ai-app-kernel/assets/ai-logo.png')));
assert.ok(read('public/index.html').includes('communication-pause.js'));
assert.ok(read('public/game.js').includes("communicationPause.open('chat')"));
assert.ok(read('public/game.js').includes("communicationPause.open('ai')"));
assert.ok(read('public/game.js').includes("communicationPause.open('ai-modal')"));
assert.ok(read('server.js').includes("humansOf(r).length === 1"));
assert.ok(!read('docker-compose.yml').includes('/var/run/docker.sock'));
assert.ok(!read('docker-compose.yml').includes('privileged: true'));
console.log('upgrade-smoke: 10/10 passed');
