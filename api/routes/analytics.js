const express = require('express');
const db = require('../db');
const { requireJWT } = require('../middleware/auth');

const router = express.Router();

// GET /analytics/summary
// Total shares, total discount given, total Authorizd fees — all time and last 30 days
router.get('/summary', requireJWT, (req, res) => {
  const mid = req.merchant.id;

  const allTime = db.prepare(`
    SELECT
      COUNT(*)                    AS total_shares,
      COALESCE(SUM(discount_amount), 0) AS total_discount_given,
      COALESCE(SUM(platform_fee), 0)    AS total_platform_fees
    FROM share_events
    WHERE merchant_id = ?
  `).get(mid);

  const last30 = db.prepare(`
    SELECT
      COUNT(*)                    AS total_shares,
      COALESCE(SUM(discount_amount), 0) AS total_discount_given,
      COALESCE(SUM(platform_fee), 0)    AS total_platform_fees
    FROM share_events
    WHERE merchant_id = ?
      AND datetime(created_at) >= datetime('now', '-30 days')
  `).get(mid);

  const byPlatform = db.prepare(`
    SELECT platform, COUNT(*) AS shares, COALESCE(SUM(discount_amount), 0) AS discount_given
    FROM share_events
    WHERE merchant_id = ?
    GROUP BY platform
  `).all(mid);

  res.json({
    all_time: {
      total_shares: allTime.total_shares,
      total_discount_given: parseFloat(allTime.total_discount_given.toFixed(2)),
      total_platform_fees: parseFloat(allTime.total_platform_fees.toFixed(2)),
    },
    last_30_days: {
      total_shares: last30.total_shares,
      total_discount_given: parseFloat(last30.total_discount_given.toFixed(2)),
      total_platform_fees: parseFloat(last30.total_platform_fees.toFixed(2)),
    },
    by_platform: byPlatform.map(r => ({
      platform: r.platform,
      shares: r.shares,
      discount_given: parseFloat(r.discount_given.toFixed(2)),
    })),
  });
});

// GET /analytics/events?limit=50&offset=0
// Paginated list of individual share events for this merchant
router.get('/events', requireJWT, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;

  const events = db.prepare(`
    SELECT id, order_ref, cart_value, discount_pct, discount_amount, platform_fee, platform, created_at
    FROM share_events
    WHERE merchant_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.merchant.id, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) AS n FROM share_events WHERE merchant_id = ?`)
    .get(req.merchant.id).n;

  res.json({ total, limit, offset, events });
});

module.exports = router;
