'use strict';
const fs = require('fs'), path = require('path');
const MAX = 400;
const buf = [];
function dataDir() { return process.env.DATA_DIR || path.join(__dirname, 'data'); }
function logFile() { return path.join(dataDir(), 'app-activity.log'); }
function push(level, source, message, extra) {
  const row = { t: new Date().toISOString(), level: String(level || 'info'), source: String(source || 'app').slice(0, 40), message: String(message || '').slice(0, 800), extra: extra ? String(extra).slice(0, 400) : undefined };
  buf.push(row); if (buf.length > MAX) buf.shift();
  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.appendFileSync(logFile(), JSON.stringify(row) + '\n');
  } catch (e) {}
  return row;
}
function list(limit) {
  const n = Math.min(Math.max(+limit || 100, 1), MAX);
  return buf.slice(-n);
}
function clear() { buf.length = 0; try { fs.writeFileSync(logFile(), ''); } catch (e) {} }
// seed from file (best-effort)
try {
  const lines = fs.readFileSync(logFile(), 'utf8').trim().split('\n').filter(Boolean).slice(-MAX);
  for (const line of lines) { try { buf.push(JSON.parse(line)); } catch (e) {} }
} catch (e) {}
module.exports = { push, list, clear, info: (s, m, e) => push('info', s, m, e), warn: (s, m, e) => push('warn', s, m, e), error: (s, m, e) => push('error', s, m, e) };
