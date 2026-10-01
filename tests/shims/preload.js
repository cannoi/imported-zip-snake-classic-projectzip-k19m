'use strict';
// Test-only: if the real `express` / `socket.io` are not installed (offline sandbox), resolve tiny stand-ins so server.js can be started and probed over real HTTP.
// When the real packages ARE installed they always win, so the same test becomes a true end-to-end check.
const Module = require('module'), path = require('path'), orig = Module._resolveFilename;
const real = name => { try { orig.call(Module, name, { id: 'x', filename: path.join(process.cwd(), 'server.js'), paths: Module._nodeModulePaths(process.cwd()) }); return true; } catch (e) { return false; } };
const map = { express: 'express-shim.js', 'socket.io': 'socketio-shim.js' };
global.__SHIMMED = [];
Module._resolveFilename = function (request, ...rest) {
  if (map[request] && !real(request)) { if (!global.__SHIMMED.includes(request)) global.__SHIMMED.push(request); return path.join(__dirname, map[request]); }
  return orig.call(this, request, ...rest);
};
