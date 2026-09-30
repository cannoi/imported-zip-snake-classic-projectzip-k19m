'use strict';
const assert = require('assert');
(async () => {
  const { classifyProviderError, normalizeModel, friendlyAiError } = await import('../ai-app-kernel/src/router.js');
  assert.strictEqual(normalizeModel('gemini', 'gemini-1.5-flash'), 'gemini-2.5-flash');
  assert.strictEqual(normalizeModel('gemini', ''), 'gemini-2.5-flash');
  const bill = classifyProviderError(new Error('deepseek HTTP 402: {"error":{"message":"Insufficient Balance"}}'));
  assert.strictEqual(bill.kind, 'billing');
  assert.strictEqual(bill.retryModel, false);
  const nf = classifyProviderError(new Error('gemini HTTP 404: models/gemini-1.5-flash is not found for API version v1beta'));
  assert.strictEqual(nf.kind, 'model');
  assert.strictEqual(nf.retryModel, true);
  const auth = classifyProviderError(new Error('openai HTTP 401: invalid api key'));
  assert.strictEqual(auth.kind, 'auth');
  const msg = friendlyAiError(new Error('deepseek HTTP 402: Insufficient Balance'));
  assert.ok(/credit/i.test(msg.text));
  console.log('AI error class: 6/6 passed');
})().catch(err => { console.error(err); process.exit(1); });
