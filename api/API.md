# Authorizd API Reference

Base URL: `https://api.authorizd.com` (or `http://localhost:3001` in dev)

---

## Authentication

Two auth schemes:

| Scheme | Header | Used by |
|--------|--------|---------|
| JWT | `Authorization: Bearer <token>` | Merchant dashboard |
| API Key | `X-Api-Key: authd_...` | WooCommerce / Shopify plugin |

---

## Merchant Endpoints (Dashboard)

### Register
```
POST /merchants/register
Body: { email, password, shop_name }
Response: { token, merchant }
```

### Login
```
POST /merchants/login
Body: { email, password }
Response: { token, merchant }
```

### Get Profile + Config
```
GET /merchants/me
Auth: JWT
Response: { merchant }
```

### Update Config
```
PUT /merchants/me/config
Auth: JWT
Body: { discount_percent?, platforms? }
  platforms: ["facebook"] | ["facebook","twitter"] | ["facebook","twitter","instagram"]
Response: { merchant }
```

### Rotate API Key
```
POST /merchants/me/rotate-key
Auth: JWT
Response: { api_key }
```

---

## Token Endpoints (Plugin → API)

### Create Share Token
Called when a customer clicks "Share for X% off". Returns a short-lived one-time token.

```
POST /tokens
Auth: API Key
Body: { order_ref, cart_value, platform? }
  order_ref   — your internal cart/order ID (string)
  cart_value  — pre-discount total (number)
  platform    — "facebook" | "twitter" | "instagram" (default: "facebook")

Response 201:
{
  token: "uuid",
  expires_at: "2024-01-01T00:10:00.000Z",
  discount_percent: 15
}
```

### Redeem Share Token
Called after FB.ui / Twitter / Instagram share callback confirms the post was made.
Single-use. Returns the discount code to apply to the order.

```
POST /tokens/:token/redeem
Auth: API Key

Response 200:
{
  discount_code: "SHARE-ABC123",
  discount_percent: 15,
  discount_amount: 18.00,
  platform_fee: 3.60,
  cart_value: 120.00,
  platform: "facebook"
}

Error responses:
  404 — token not found
  403 — token belongs to a different merchant
  409 — token already redeemed
  410 — token expired
```

---

## Analytics Endpoints (Dashboard)

### Summary
```
GET /analytics/summary
Auth: JWT
Response:
{
  all_time:     { total_shares, total_discount_given, total_platform_fees },
  last_30_days: { total_shares, total_discount_given, total_platform_fees },
  by_platform:  [{ platform, shares, discount_given }]
}
```

### Events (paginated)
```
GET /analytics/events?limit=50&offset=0
Auth: JWT
Response:
{
  total: 142,
  limit: 50,
  offset: 0,
  events: [{ id, order_ref, cart_value, discount_pct, discount_amount, platform_fee, platform, created_at }]
}
```

---

## Plugin Integration Flow

```
1. Customer clicks "Share for 15% off"
2. Plugin → POST /tokens  { order_ref, cart_value }
   ← { token, expires_at, discount_percent }
3. Plugin opens FB.ui share dialog, holds token client-side
4. FB.ui callback fires (share confirmed)
5. Plugin → POST /tokens/:token/redeem
   ← { discount_code, discount_amount }
6. Plugin applies discount_code to cart/order
7. Customer sees discount applied ✓
```
