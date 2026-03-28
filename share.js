/**
 * Social Share & Save
 * Lets users share their purchase and receive a timed discount code.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DISCOUNT_PERCENTAGE = 15;
const DISCOUNT_EXPIRY_HOURS = 24;

// Mock order data — in a real integration, pull from URL params or session
const ORDER = {
  id: 'AU-8472',
  date: 'March 28, 2026',
  items: [
    { name: 'Premium Wireless Headphones', qty: 1, price: 89.99 },
    { name: 'Leather Phone Case',           qty: 2, price: 17.50 },
  ],
  shipping: 0,
};

// Pre-built share message
const SHARE_TEXT =
  `Just ordered from authorizd and I'm obsessed! 🛍️ Amazing products — check them out! #authorizd #shopping`;
const SHARE_URL = window.location.href;

// Platform definitions
const PLATFORMS = {
  twitter: {
    label: 'X (Twitter)',
    shareUrl: (t, u) =>
      `https://twitter.com/intent/tweet?text=${enc(t)}&url=${enc(u)}`,
  },
  facebook: {
    label: 'Facebook',
    shareUrl: (t, u) =>
      `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}&quote=${enc(t)}`,
  },
  whatsapp: {
    label: 'WhatsApp',
    shareUrl: (t, u) =>
      `https://wa.me/?text=${enc(t + '\n' + u)}`,
  },
  linkedin: {
    label: 'LinkedIn',
    shareUrl: (t, u) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}&summary=${enc(t)}`,
  },
  native: {
    label: 'Other',
    shareUrl: null, // handled via Web Share API
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function enc(s) { return encodeURIComponent(s); }

function fmt(amount) {
  return '$' + amount.toFixed(2);
}

function pad(n) { return String(n).padStart(2, '0'); }

// ---------------------------------------------------------------------------
// Order rendering
// ---------------------------------------------------------------------------
function renderOrder() {
  let subtotal = 0;
  ORDER.items.forEach(i => { subtotal += i.price * i.qty; });
  const total = subtotal + ORDER.shipping;

  document.getElementById('orderMeta').textContent =
    `Order #${ORDER.id} · ${ORDER.date}`;

  const tbody = document.getElementById('orderItems');
  tbody.innerHTML = ORDER.items.map(item => `
    <tr>
      <td class="ps-4">${item.name}</td>
      <td class="text-center">${item.qty}</td>
      <td class="text-end pe-4">${fmt(item.price * item.qty)}</td>
    </tr>
  `).join('');

  document.getElementById('orderSubtotal').textContent = fmt(subtotal);
  document.getElementById('orderTotal').textContent = fmt(total);
}

// ---------------------------------------------------------------------------
// Discount code logic
// ---------------------------------------------------------------------------
const STORAGE_CODE_KEY  = 'authorizd_shareDiscount';
const STORAGE_SHARE_KEY = 'authorizd_sharedPlatforms';

function getOrCreateDiscount() {
  const stored = localStorage.getItem(STORAGE_CODE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (new Date(parsed.expiry) > new Date()) {
      return parsed;
    }
    // Expired — remove it so a fresh one can be generated
    localStorage.removeItem(STORAGE_CODE_KEY);
  }

  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const code   = `SHARE${DISCOUNT_PERCENTAGE}-${suffix}`;
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + DISCOUNT_EXPIRY_HOURS);

  const discount = { code, expiry: expiry.toISOString(), percentage: DISCOUNT_PERCENTAGE };
  localStorage.setItem(STORAGE_CODE_KEY, JSON.stringify(discount));
  return discount;
}

function loadSharedPlatforms() {
  return JSON.parse(localStorage.getItem(STORAGE_SHARE_KEY) || '[]');
}

function saveSharedPlatforms(list) {
  localStorage.setItem(STORAGE_SHARE_KEY, JSON.stringify(list));
}

// ---------------------------------------------------------------------------
// UI: share buttons
// ---------------------------------------------------------------------------
function markButtonShared(platform) {
  const btn = document.querySelector(`[data-platform="${platform}"]`);
  if (!btn) return;
  btn.querySelector('.share-label').textContent = 'Shared!';
  btn.classList.add('shared');
}

function updateSharedTracker(platforms) {
  if (platforms.length === 0) return;
  const tracker = document.getElementById('sharedTracker');
  const list    = document.getElementById('sharedList');
  const labels  = platforms.map(p => PLATFORMS[p]?.label || p);
  list.textContent = labels.join(', ');
  tracker.classList.remove('d-none');
}

// ---------------------------------------------------------------------------
// UI: discount reveal
// ---------------------------------------------------------------------------
function revealDiscount(discount) {
  const section = document.getElementById('discountReveal');
  document.getElementById('discountCode').textContent = discount.code;

  section.classList.remove('d-none');
  // Trigger reflow so animation plays even if called twice
  void section.offsetHeight;
  section.classList.add('animate-in');

  startCountdown(new Date(discount.expiry));
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function startCountdown(expiryDate) {
  const el = document.getElementById('countdown');

  function tick() {
    const diff = expiryDate - Date.now();
    if (diff <= 0) {
      el.textContent = 'Expired';
      el.closest('.discount-reveal').classList.add('expired');
      return;
    }
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    setTimeout(tick, 1_000);
  }
  tick();
}

// ---------------------------------------------------------------------------
// Copy to clipboard
// ---------------------------------------------------------------------------
function setupCopyButton() {
  document.getElementById('copyBtn').addEventListener('click', () => {
    const code = document.getElementById('discountCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('copyBtn');
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check2 me-1"></i> Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('copied');
      }, 2_500);
    });
  });
}

// ---------------------------------------------------------------------------
// Core share handler
// ---------------------------------------------------------------------------
function handleShare(platform) {
  // Open the share window / dialog
  if (platform !== 'native') {
    const config = PLATFORMS[platform];
    const url    = config.shareUrl(SHARE_TEXT, SHARE_URL);
    window.open(url, '_blank', 'width=620,height=480,noopener,noreferrer');
  }

  // Record the share
  const sharedPlatforms = loadSharedPlatforms();
  if (!sharedPlatforms.includes(platform)) {
    sharedPlatforms.push(platform);
    saveSharedPlatforms(sharedPlatforms);
  }

  // Generate / fetch discount and reveal it
  const discount = getOrCreateDiscount();
  revealDiscount(discount);

  // Update UI
  markButtonShared(platform);
  updateSharedTracker(loadSharedPlatforms());
}

// ---------------------------------------------------------------------------
// Native Web Share API
// ---------------------------------------------------------------------------
function setupNativeShare() {
  const btn = document.getElementById('nativeShareBtn');
  if (!navigator.share) return;

  btn.classList.remove('d-none');
  btn.addEventListener('click', async () => {
    try {
      await navigator.share({
        title: 'Check out my purchase from authorizd!',
        text:  SHARE_TEXT,
        url:   SHARE_URL,
      });
      handleShare('native');
    } catch {
      // User cancelled — no action needed
    }
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderOrder();
  setupCopyButton();
  setupNativeShare();

  // Wire up platform share buttons
  document.querySelectorAll('[data-platform]').forEach(btn => {
    btn.addEventListener('click', () => handleShare(btn.dataset.platform));
  });

  // Restore state if user has already shared in this session
  const sharedPlatforms = loadSharedPlatforms();
  if (sharedPlatforms.length > 0) {
    const stored = localStorage.getItem(STORAGE_CODE_KEY);
    if (stored) {
      const discount = JSON.parse(stored);
      if (new Date(discount.expiry) > new Date()) {
        revealDiscount(discount);
      }
    }
    sharedPlatforms.forEach(markButtonShared);
    updateSharedTracker(sharedPlatforms);
  }
});
