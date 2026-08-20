const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const authHandler = require('../api/gestao-auth');
const filesHandler = require('../api/gestao-files');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

function apiResponse(res) {
  return {
    setHeader(name, value) { res.setHeader(name, value); },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
    },
    end() { res.end(); }
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, 'utf8') > 2 * 1024 * 1024) {
        reject(Object.assign(new Error('Pedido demasiado grande.'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(Object.assign(new Error('JSON inválido.'), { statusCode: 400 })); }
    });
    req.on('error', reject);
  });
}

async function callApi(handler, req, res) {
  try {
    req.body = await readBody(req);
    await handler(req, apiResponse(res));
  } catch (error) {
    if (!res.headersSent) {
      res.statusCode = error.statusCode || 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: error.message || 'Erro interno.' }));
    }
  }
}

function safeStaticPath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const clean = decoded === '/gestão' || decoded === '/gestao' ? '/gestao.html' : decoded;
  const candidate = path.resolve(root, `.${clean === '/' ? '/index.html' : clean}`);
  return candidate.startsWith(root + path.sep) ? candidate : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/gestao-auth') return callApi(authHandler, req, res);
  if (url.pathname === '/api/gestao-files') return callApi(filesHandler, req, res);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  const filePath = safeStaticPath(url.pathname);
  if (!filePath) { res.statusCode = 400; return res.end('Bad Request'); }
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) { res.statusCode = 404; return res.end('Not Found'); }
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', url.pathname === '/gestão' ? 'no-store' : 'public, max-age=300');
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Aurora server listening on port ${port}`);
});
