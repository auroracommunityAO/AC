const crypto = require('crypto');

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método não permitido.' });
    return;
  }

  const configuredToken = process.env.GESTAO_TOKEN;
  const requestToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';

  if (!configuredToken) {
    res.status(503).json({ ok: false, error: 'A autenticação ainda não está configurada no servidor.' });
    return;
  }

  if (!safeEqual(requestToken, configuredToken)) {
    res.status(401).json({ ok: false, error: 'Token inválido.' });
    return;
  }

  res.status(200).json({ ok: true });
};
