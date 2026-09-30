'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const bridge = fs.readFileSync(path.join(root, 'ai-bridge.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const game = fs.readFileSync(path.join(root, 'public/game.js'), 'utf8');
const router = fs.readFileSync(path.join(root, 'ai-app-kernel/src/router.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'ai-app-kernel/src/index.js'), 'utf8');

assert(html.includes('id="ai-provider"'), 'provider selector must be available');
assert(html.includes('id="ai-model"'), 'model input must be available');
assert(game.includes('ai-provider'), 'game must submit selected provider');
assert(game.includes('ai-model'), 'game must submit selected model');
assert(bridge.includes('provider:') && bridge.includes('model:'), 'bridge must persist provider/model configuration');
assert(bridge.includes('b.provider') && bridge.includes('b.model'), 'key route must accept provider/model');
assert(bridge.includes('c.baseUrl') && bridge.includes("'|' + c.baseUrl + '|'"), 'kernel must rebuild when endpoint changes');
assert(index.includes('...(requested ? [requested] : [])'), 'selected model must be first fallback candidate');
assert(index.includes('modelsFor(provider)') || index.includes('modelsFor(route.provider)'), 'kernel must try model candidates');
console.log('AI routing UI/bridge regression checks: PASS');
