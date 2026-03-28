const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireApiKey } = require('../middleware/auth');

const router = express.Router();

const TOKEN_TTL_MINUTES = 10;

function generateDiscountCode(merchantId) {
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SHARE-${suffix}`;
}

// POST /tokens
// Called by the plugin when a customer clicks "Share for X% off"
// Returns a one-time token the client holds during the FB share flow
router.post('/', requireApiKey, (req, res) => {
  const { order_ref, cart_value, platform = 'facebook' } = req.body;

  if (!order_ref || typeof cart_value !== 'number' || cart_value <= 0) {
    return res.status(400).json({ error: 'order_ref and a positive cart_value are required' });
  }

  const allowed = ['facebook', 'twitter', 'instagram'];
  if (!allowed.includes(platform)) {
    return res.status(400).json({ error: `platform must be one of: ${allowed.join(', ')}` });
  }

  const merchant = req.merchant;
  const platforms = JSON.parse(merchant.platforms);
  if (!platforms.includes(platform)) {
    return res.status(400).json({ error: `Platform "${platform}" is not enabled for this merchant` });
  }

  // Check for an existing pending token for this order to prevent duplicates
  const existing = db.prepare(`
    SELECT * FROM share_tokens
    WHERE merchant_id = ? AND order_ref = ? AND status = 'pending'
      AND datetime(expires_at) > datetime('now')
  `).get(merchant.id, order_ref);

  if (existing) {
    return res.json({
      token: existing.token,
      expires_at: existing.expires_at,
      discount_percent: existing.discount_pct,
    });
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO share_tokens (token, merchant_id, order_ref, cart_value, discount_pct, platform, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(token, merchant.id, order_ref, cart_value, merchant.discount_percent, platform, expiresAt);

  res.status(201).json({
    token,
    expires_at: expiresAt,
    discount_percent: merchant.discount_percent,
  });
});

// POST /tokens/:token/redeem
// Called by the plugin after FB.ui callback confirms the share happened.
// Single-use. Returns a discount code the plugin applies to the cart/order.
router.post('/:token/redeem', requireApiKey, (req, res) => {
  const { token } = req.params;

  const shareToken = db.prepare('SELECT * FROM share_tokens WHERE token = ?').get(token);

  if (!shareToken) {
    return res.status(404).json({ error: 'Token not found' });
  }
  if (shareToken.merchant_id !== req.merchant.id) {
    return res.status(403).json({ error: 'Token does not belong to this merchant' });
  }
  if (shareToken.status === 'redeemed') {
    return res.status(409).json({ error: 'Token already redeemed' });
  }
  if (shareToken.status === 'expired' || new Date(shareToken.expires_at) < new Date()) {
    db.prepare(`UPDATE share_tokens SET status = 'expired' WHERE token = ?`).run(token);
    return res.status(410).json({ error: 'Token has expired. Please share again.' });
  }

  const merchant = req.merchant;
  const discountAmount = shareToken.cart_value * (shareToken.discount_pct / 100);
  const platformFee = discountAmount * (merchant.fee_percent / 100);
  const discountCode = generateDiscountCode(merchant.id);

  // Mark token redeemed and record the share event in one transaction
  const redeem = db.transaction(() => {
    db.prepare(`
      UPDATE share_tokens
      SET status = 'redeemed', redeemed_at = datetime('now'), discount_code = ?
      WHERE token = ?
    `).run(discountCode, token);

    db.prepare(`
      INSERT INTO share_events (id, merchant_id, token, order_ref, cart_value, discount_pct, discount_amount, platform_fee, platform)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      merchant.id,
      token,
      shareToken.order_ref,
      shareToken.cart_value,
      shareToken.discount_pct,
      discountAmount,
      platformFee,
      shareToken.platform,
    );
  });

  redeem();

  res.json({
    discount_code: discountCode,
    discount_percent: shareToken.discount_pct,
    discount_amount: parseFloat(discountAmount.toFixed(2)),
    platform_fee: parseFloat(platformFee.toFixed(2)),
    cart_value: shareToken.cart_value,
    platform: shareToken.platform,
  });
});

module.exports = router;
