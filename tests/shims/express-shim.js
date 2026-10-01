'use strict';
const fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
function express() {
  const stack = [];
  const app = (req, res) => {
    const u = new URL(req.url, 'http://x'); req.path = u.pathname; req.query = Object.fromEntries(u.searchParams); req.protocol = 'http'; req.ip = req.socket.remoteAddress;
    req.get = n => req.headers[String(n).toLowerCase()];
    res.status = c => { res.statusCode = c; return res; }; res.setHeaderIf = (k, v) => { if (!res.getHeader(k)) res.setHeader(k, v); };
    res.json = b => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); };
    res.send = b => { res.setHeaderIf('Content-Type', 'text/plain; charset=utf-8'); res.end(typeof b === 'string' ? b : JSON.stringify(b)); };
    let i = 0; const next = () => { const layer = stack[i++]; if (!layer) { res.statusCode = 404; return res.end('Not found'); } try { const r = layer(req, res, next); if (r && r.catch) r.catch(e => { res.statusCode = 500; res.end(String(e && e.message)); }); } catch (e) { res.statusCode = 500; res.end(String(e && e.message)); } };
    next();
  };
  app.use = fn => { stack.push(fn); return app; }; app.set = () => app; app.disable = () => app;
  const route = method => (p, h) => { stack.push((req, res, next) => (req.method === method && req.path === p) ? h(req, res, next) : next()); return app; };
  app.get = route('GET'); app.post = route('POST');
  return app;
}
express.json = () => (req, res, next) => {
  if (req.method !== 'POST') return next(); let d = ''; req.on('data', c => { d += c; });
  req.on('end', () => { try { req.body = d ? JSON.parse(d) : {}; } catch (e) { req.body = {}; } next(); });
};
express.static = dir => (req, res, next) => {
  if (req.method !== 'GET') return next();
  const root = path.resolve(process.cwd(), dir), f = path.resolve(root, '.' + (req.path === '/' ? '/index.html' : req.path));
  if (!f.startsWith(root) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return next();
  res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f));
};
module.exports = express;
