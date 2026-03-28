/**
 * Checkout — Facebook Share & Save
 */

const FB_APP_ID = '931561519624337';
const DISCOUNT_PERCENTAGE = 15;

const ORDER = {
  items: [
    { name: 'Premium Wireless Headphones', qty: 1, price: 89.99 },
    { name: 'Leather Phone Case',           qty: 2, price: 17.50 },
  ],
  shipping: 0,
};

const SHARE_TEXT = `Just grabbed something great from authorizd! 🛍️ Check them out — amazing products. #authorizd #shopping`;
const SHARE_URL  = window.location.href;

window.fbAsyncInit = function () {
  FB.init({ appId: FB_APP_ID, cookie: true, xfbml: true, version: 'v19.0' });
};

function fmt(n) { return '$' + n.toFixed(2); }

function calcTotals(discounted = false) {
  const subtotal = ORDER.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discount = discounted ? subtotal * (DISCOUNT_PERCENTAGE / 100) : 0;
  const total    = subtotal - discount + ORDER.shipping;
  return { subtotal, discount, total };
}

function renderOrder(discounted = false) {
  const { subtotal, discount, total } = calcTotals(discounted);
  document.getElementById('orderItems').innerHTML = ORDER.items.map(item => `
    <tr>
      <td class="ps-4">${item.name}</td>
      <td class="text-center">${item.qty}</td>
      <td class="text-end pe-4">${fmt(item.price * item.qty)}</td>
    </tr>
  `).join('');
  document.getElementById('orderSubtotal').textContent   = fmt(subtotal);
  document.getElementById('orderTotal').textContent      = fmt(total);
  document.getElementById('placeOrderTotal').textContent = fmt(total);
  if (discounted) {
    document.getElementById('discountAmount').textContent = '-' + fmt(discount);
    const row = document.getElementById('discountRow');
    row.classList.remove('d-none');
    void row.offsetHeight;
    row.classList.add('animate-in');
  }
}

let hasShared = false;

function openFBShare() {
  if (hasShared) return;
  const btn = document.getElementById('fbShareBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Opening Facebook…';
  waitForFB(() => {
    FB.ui({ method: 'share', href: SHARE_URL, quote: SHARE_TEXT }, function (response) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-facebook"></i> Share on Facebook &amp; Save 15%';
      if (response && !response.error_message) {
        hasShared = true;
        applyDiscount();
      } else {
        showCancelNudge();
      }
    });
  });
}

function waitForFB(callback) {
  if (typeof FB !== 'undefined') { callback(); }
  else { setTimeout(() => waitForFB(callback), 100); }
}

function applyDiscount() {
  renderOrder(true);
  document.getElementById('sharePrompt').classList.add('d-none');
  const success = document.getElementById('shareSuccess');
  success.classList.remove('d-none');
  void success.offsetHeight;
  success.classList.add('animate-in');
  const totalCell = document.getElementById('orderTotal');
  totalCell.classList.add('total-updated');
  setTimeout(() => totalCell.classList.remove('total-updated'), 1800);
  document.getElementById('placeOrderBtn').classList.add('discounted');
}

function showCancelNudge() {
  document.getElementById('cancelNudge').classList.remove('d-none');
}

function setupNativeShare() {
  const btn = document.getElementById('nativeShareBtn');
  if (!navigator.share) return;
  btn.classList.remove('d-none');
  btn.addEventListener('click', async () => {
    try { await navigator.share({ title: 'Check out authorizd!', text: SHARE_TEXT, url: SHARE_URL }); }
    catch { /* cancelled */ }
  });
}

function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const fire = confetti.create(canvas, { resize: true, useWorker: true });
  fire({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
  setTimeout(() => {
    fire({ particleCount: 60, angle: 60,  spread: 55, origin: { x: 0, y: 0.6 } });
    fire({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } });
  }, 300);
}

function showCongrats(discounted) {
  const { subtotal, discount, total } = calcTotals(discounted);
  document.querySelector('.container.py-4').classList.add('d-none');
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
