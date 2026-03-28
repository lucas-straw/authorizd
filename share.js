/**
 * Checkout — Facebook Share & Save
 * User shares their cart to Facebook via the JS SDK.
 * The discount is only applied after Facebook confirms the post was made.
 */

// ---------------------------------------------------------------------------
// Config — store owner replaces this with their Facebook App ID
// Get one free at: developers.facebook.com → Create App → Consumer
// ---------------------------------------------------------------------------
const FB_APP_ID = '931561519624337';

const DISCOUNT_PERCENTAGE = 15;

// Mock order — in a real integration pull from session / URL params
const ORDER = {
  items: [
    { name: 'Premium Wireless Headphones', qty: 1, price: 89.99 },
    { name: 'Leather Phone Case',           qty: 2, price: 17.50 },
  ],
  shipping: 0,
};

// Content that will be pre-filled in the Facebook post
const SHARE_TEXT = `Just grabbed something great from authorizd! 🛍️ Check them out — amazing products. #authorizd #shopping`;
const SHARE_URL  = window.location.href;

// ---------------------------------------------------------------------------
// Facebook SDK init
// fbAsyncInit is called automatically by the SDK once it loads
// ---------------------------------------------------------------------------
window.fbAsyncInit = function () {
  FB.init({
    appId:   FB_APP_ID,
    cookie:  true,
    xfbml:   true,
    version: 'v19.0',
  });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n) { return '$' + n.toFixed(2); }

function calcTotals(discounted = false) {
  const subtotal = ORDER.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discount = discounted ? subtotal * (DISCOUNT_PERCENTAGE / 100) : 0;
  const total    = subtotal - discount + ORDER.shipping;
  return { subtotal, discount, total };
}

// ---------------------------------------------------------------------------
// Render order summary
// ---------------------------------------------------------------------------
function renderOrder(discounted = false) {
  const { subtotal, discount, total } = calcTotals(discounted);

  document.getElementById('orderItems').innerHTML = ORDER.items.map(item => `
    <tr>
      <td class="ps-4">${item.name}</td>
      <td class="text-center">${item.qty}</td>
      <td class="text-end pe-4">${fmt(item.price * item.qty)}</td>
    </tr>
  `).join('');

  document.getElementById('orderSubtotal').textContent    = fmt(subtotal);
  document.getElementById('orderTotal').textContent       = fmt(total);
  document.getElementById('placeOrderTotal').textContent  = fmt(total);

  if (discounted) {
    document.getElementById('discountAmount').textContent = '-' + fmt(discount);
    const row = document.getElementById('discountRow');
    row.classList.remove('d-none');
    void row.offsetHeight;
    row.classList.add('animate-in');
  }
}

// ---------------------------------------------------------------------------
// Facebook share flow
// ---------------------------------------------------------------------------
let hasShared = false;

function openFBShare() {
  // Guard: don't re-trigger if already applied
  if (hasShared) return;

  // Show loading state on button
  const btn = document.getElementById('fbShareBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Opening Facebook…';

  // Wait for SDK to be ready, then open share dialog
  waitForFB(() => {
    FB.ui({
      method: 'share',
      href:   SHARE_URL,
      quote:  SHARE_TEXT,
    }, function (response) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-facebook"></i> Share on Facebook &amp; Save 15%';

      if (response && !response.error_message) {
        // Facebook confirmed the post was shared
        hasShared = true;
        applyDiscount();
      } else {
        // User closed or cancelled the dialog — show nudge
        showCancelNudge();
      }
    });
  });
}

// Polls until the FB SDK is available (it loads asynchronously)
function waitForFB(callback) {
  if (typeof FB !== 'undefined') {
    callback();
  } else {
    setTimeout(() => waitForFB(callback), 100);
  }
}

// ---------------------------------------------------------------------------
// Apply discount
// ---------------------------------------------------------------------------
function applyDiscount() {
  renderOrder(true);

  // Swap share card to success state
  document.getElementById('sharePrompt').classList.add('d-none');
  const success = document.getElementById('shareSuccess');
  success.classList.remove('d-none');
  void success.offsetHeight;
  success.classList.add('animate-in');

  // Pulse the total to draw attention
  const totalCell = document.getElementById('orderTotal');
  totalCell.classList.add('total-updated');
  setTimeout(() => totalCell.classList.remove('total-updated'), 1_800);

  // Turn the place order button green
  document.getElementById('placeOrderBtn').classList.add('discounted');
}

// ---------------------------------------------------------------------------
// Cancel nudge
// ---------------------------------------------------------------------------
function showCancelNudge() {
  document.getElementById('cancelNudge').classList.remove('d-none');
}

// ---------------------------------------------------------------------------
// Native Web Share API (secondary — Instagram / other apps on mobile)
// No verified callback available, so no discount for this path
// ---------------------------------------------------------------------------
function setupNativeShare() {
  const btn = document.getElementById('nativeShareBtn');
  if (!navigator.share) return;

  btn.classList.remove('d-none');
  btn.addEventListener('click', async () => {
    try {
      await navigator.share({
        title: 'Check out authorizd!',
        text:  SHARE_TEXT,
        url:   SHARE_URL,
      });
    } catch { /* user cancelled */ }
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function launchConfetti() {
  // Centre burst from top
  confetti({ particleCount: 150, spread: 90, origin: { x: 0.5, y: 0.2 } });
  // Side bursts
  setTimeout(() => {
    confetti({ particleCount: 80, angle: 60,  spread: 70, origin: { x: 0, y: 0.3 } });
    confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.3 } });
  }, 300);
  // Trailing shower down the middle
  setTimeout(() => {
    confetti({ particleCount: 60, spread: 120, origin: { x: 0.5, y: 0 } });
  }, 650);
}

function showCongrats(discounted) {
  const { subtotal, discount, total } = calcTotals(discounted);

  // Hide checkout, show congrats
  document.getElementById('checkoutContainer').classList.add('d-none');
  const screen = document.getElementById('congratsScreen');
  screen.classList.remove('d-none');

  document.getElementById('congratsSavings').textContent  = fmt(discount);
  document.getElementById('congratsOriginal').textContent = fmt(subtotal);
  document.getElementById('congratsDiscount').textContent = '-' + fmt(discount);
  document.getElementById('congratsTotal').textContent    = fmt(total);

  window.scrollTo({ top: 0, behavior: 'smooth' });
  launchConfetti();
}

document.addEventListener('DOMContentLoaded', () => {
  // ?success=true simulates returning after a completed share + order
  if (new URLSearchParams(window.location.search).get('success') === 'true') {
    renderOrder(true);
    showCongrats(true);
    return;
  }

  renderOrder(false);
  setupNativeShare();

  document.getElementById('fbShareBtn').addEventListener('click', openFBShare);
  document.getElementById('retryBtn').addEventListener('click', () => {
    document.getElementById('cancelNudge').classList.add('d-none');
    openFBShare();
  });

  document.getElementById('placeOrderBtn').addEventListener('click', () => {
    showCongrats(hasShared);
  });
});
