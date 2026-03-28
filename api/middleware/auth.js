const jwt = require('jsonwebtoken');
const db = require('../db');

// JWT auth — used for merchant dashboard requests
function requireJWT(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(payload.sub);
    if (!merchant) return res.status(401).json({ error: 'Merchant not found' });
    req.merchant = merchant;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// API key auth — used by WooCommerce/Shopify plugin requests
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key) return res.status(401).json({ error: 'Missing API key' });

  const merchant = db.prepare('SELECT * FROM merchants WHERE api_key = ? AND active = 1').get(key);
  if (!merchant) return res.status(401).json({ error: 'Invalid API key' });

  req.merchant = merchant;
  next();
}

module.exports = { requireJWT, requireApiKey };
