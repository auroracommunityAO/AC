const crypto = require('crypto');

const MAX_FILE_BYTES = 1024 * 1024;
const ALLOWED_ACTIONS = new Set(['list', 'read', 'write', 'delete']);

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function json(res, status, payload) {
  res.status(status).json(payload);
}

function cleanPath(value = '') {
  const path = String(value).trim().replace(/^\/+/, '');
  if (!path || path.includes('..') || path.startsWith('.git/')) return '';
  return path;
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function githubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Aurora-Gestao'
  };
}

function githubUrl(path, query = '') {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}${query}`;
}

function githubError(status, payload) {
  const message = payload?.message || 'O GitHub recusou o pedido.';
  if (status === 401 || status === 403) {
    return `GitHub recusou o token. Confirme que o token é de granularidade fina, pertence à conta correcta e tem “Contents: Read and write” no repositório seleccionado. (${message})`;
  }
  if (status === 404) return 'Repositório ou ficheiro não encontrado. Confirme GITHUB_OWNER, GITHUB_REPO e GITHUB_BRANCH.';
  return message;
}

async function githubRequest(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...githubHeaders(), ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(githubError(response.status, payload));
    error.status = response.status;
    throw error;
  }
  return payload;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Método não permitido.' });

  const configuredAccessToken = process.env.GESTAO_TOKEN;
  const githubToken = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';

  if (!configuredAccessToken || !githubToken || !owner || !repo) {
    return json(res, 503, { ok: false, error: 'A integração GitHub ainda não está configurada no servidor.' });
  }
  if (!safeEqual(bearer, configuredAccessToken)) return json(res, 401, { ok: false, error: 'Token de Gestão inválido.' });

  const body = parseBody(req);
  const action = String(body.action || '');
  if (!ALLOWED_ACTIONS.has(action)) return json(res, 400, { ok: false, error: 'Operação de ficheiro inválida.' });

  try {
    if (action === 'list') {
      const path = cleanPath(body.path);
      const query = `?ref=${encodeURIComponent(branch)}`;
      const payload = await githubRequest(githubUrl(path, query), { method: 'GET' });
      const files = Array.isArray(payload)
        ? payload.filter((item) => item.type === 'file').map((item) => ({ name: item.name, path: item.path, sha: item.sha, size: item.size }))
        : [];
      return json(res, 200, { ok: true, branch, repository: `${owner}/${repo}`, files });
    }

    const path = cleanPath(body.path);
    if (!path) return json(res, 400, { ok: false, error: 'Indique um caminho de ficheiro válido.' });

    if (action === 'read') {
      const payload = await githubRequest(githubUrl(path, `?ref=${encodeURIComponent(branch)}`), { method: 'GET' });
      if (payload.type !== 'file') return json(res, 400, { ok: false, error: 'O caminho indicado não é um ficheiro.' });
      const content = Buffer.from(payload.content.replace(/\s/g, ''), 'base64').toString('utf8');
      return json(res, 200, { ok: true, branch, file: { name: payload.name, path: payload.path, sha: payload.sha, size: payload.size, content } });
    }

    if (typeof body.content !== 'string') return json(res, 400, { ok: false, error: 'O conteúdo do ficheiro é obrigatório.' });
    const byteLength = Buffer.byteLength(body.content, 'utf8');
    if (byteLength > MAX_FILE_BYTES) return json(res, 413, { ok: false, error: 'O ficheiro excede o limite de 1 MB.' });

    if (action === 'delete') {
      const payload = await githubRequest(githubUrl(path), {
        method: 'DELETE',
        body: JSON.stringify({ message: body.message || `chore: eliminar ${path}`, sha: body.sha, branch })
      });
      return json(res, 200, { ok: true, commit: payload.commit?.sha || '' });
    }

    const payload = await githubRequest(githubUrl(path), {
      method: 'PUT',
      body: JSON.stringify({
        message: body.message || `${body.generate ? 'feat' : 'chore'}: actualizar ${path}`,
        content: Buffer.from(body.content, 'utf8').toString('base64'),
        branch,
        ...(body.sha ? { sha: body.sha } : {})
      })
    });
    return json(res, 200, { ok: true, commit: payload.commit?.sha || '', file: payload.content ? { path: payload.content.path, sha: payload.content.sha } : null });
  } catch (error) {
    return json(res, error.status || 502, { ok: false, error: error.message || 'Não foi possível comunicar com o GitHub.' });
  }
};
