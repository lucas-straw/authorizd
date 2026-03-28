const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'authorizd.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS merchants (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    shop_name   TEXT NOT NULL,
    api_key     TEXT UNIQUE NOT NULL,

    -- Plugin config
    discount_percent    REAL NOT NULL DEFAULT 10,
    fee_percent         REAL NOT NULL DEFAULT 20,   -- Authorizd's cut of the discount
    platforms           TEXT NOT NULL DEFAULT '["facebook"]',
    active              INTEGER NOT NULL DEFAULT 1,

    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS share_tokens (
    token         TEXT PRIMARY KEY,
    merchant_id   TEXT NOT NULL REFERENCES merchants(id),

    -- Order snapshot at token creation time
    order_ref     TEXT NOT NULL,   -- merchant's own order/cart ID
    cart_value    REAL NOT NULL,   -- pre-discount cart total
    discount_pct  REAL NOT NULL,   -- discount % configured at time of token creation

    platform      TEXT NOT NULL DEFAULT 'facebook',
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending | redeemed | expired
    discount_code TEXT,            -- generated code returned on redemption

    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    redeemed_at   TEXT,
    expires_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS share_events (
    id              TEXT PRIMARY KEY,
    merchant_id     TEXT NOT NULL REFERENCES merchants(id),
    token           TEXT NOT NULL REFERENCES share_tokens(token),

    order_ref       TEXT NOT NULL,
    cart_value      REAL NOT NULL,
    discount_pct    REAL NOT NULL,
    discount_amount REAL NOT NULL,  -- cart_value * discount_pct / 100
    platform_fee    REAL NOT NULL,  -- discount_amount * fee_percent / 100  (Authorizd revenue)
    platform        TEXT NOT NULL,

    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
