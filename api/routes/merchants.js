const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireJWT } = require('../middleware/auth');

const router = express.Router();

function generateApiKey() {
  return 'authd_' + uuidv4().replace(/-/g, '');
}

function issueJWT(merchantId) {
  return jwt.sign({ sub: merchantId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function safeMerchant(m) {
  return {
    id: m.id,
    email: m.email,
    shop_name: m.shop_name,
    api_key: m.api_key,
    discount_percent: m.discount_percent,
    fee_percent: m.fee_percent,
    platforms: JSON.parse(m.platforms),
    active: !!m.active,
    created_at: m.created_at,
  };
}

// POST /merchants/register
router.post('/register', async (req, res) => {
  const { email, password, shop_name } = req.body;
  if (!email || !password || !shop_name) {
    return res.status(400).json({ error: 'email, password, and shop_name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = db.prepare('SELECT id FROM merchants WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = uuidv4();
  const hashed = await bcrypt.hash(password, 12);
  const api_key = generateApiKey();

  db.prepare(`
    INSERT INTO merchants (id, email, password, shop_name, api_key)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, email, hashed, shop_name, api_key);

  const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(id);
  const token = issueJWT(id);

  res.status(201).json({ token, merchant: safeMerchant(merchant) });
});

// POST /merchants/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const merchant = db.prepare('SELECT * FROM merchants WHERE email = ?').get(email);
  if (!merchant) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, merchant.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = issueJWT(merchant.id);
  res.json({ token, merchant: safeMerchant(merchant) });
});

// GET /merchants/me — fetch own profile + config
router.get('/me', requireJWT, (req, res) => {
  res.json({ merchant: safeMerchant(req.merchant) });
});

// PUT /merchants/me/config — update discount %, platforms, etc.
router.put('/me/config', requireJWT, (req, res) => {
  const { discount_percent, platforms } = req.body;
  const updates = {};

  if (discount_percent !== undefined) {
    if (typeof discount_percent !== 'number' || discount_percent <= 0 || discount_percent > 100) {
      return res.status(400).json({ error: 'discount_percent must be a number between 1 and 100' });
    }
    updates.discount_percent = discount_percent;
  }

  if (platforms !== undefined) {
    const allowed = ['facebook', 'twitter', 'instagram'];
    if (!Array.isArray(platforms) || platforms.some(p => !allowed.includes(p))) {
      return res.status(400).json({ error: `platforms must be an array of: ${allowed.join(', ')}` });
    }
    updates.platforms = JSON.stringify(platforms);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE merchants SET ${setClauses} WHERE id = ?`)
    .run(...Object.values(updates), req.merchant.id);

  const updated = db.prepare('SELECT * FROM merchants WHERE id = ?').get(req.merchant.id);
  res.json({ merchant: safeMerchant(updated) });
});

// POST /merchants/me/rotate-key — issue a new API key
router.post('/me/rotate-key', requireJWT, (req, res) => {
  const newKey = generateApiKey();
  db.prepare('UPDATE merchants SET api_key = ? WHERE id = ?').run(newKey, req.merchant.id);
  res.json({ api_key: newKey });
});

module.exports = router;
