/**
 * Checkout — Social Share & Save
 * Users share their cart before paying and get 15% off the current order.
 */

const DISCOUNT_PERCENTAGE = 15;

const ORDER = {
  id: 'AU-8472',
  items: [
    { name: 'Premium Wireless Headphones', qty: 1, price: 89.99 },
    { name: 'Leather Phone Case',           qty: 2, price: 17.50 },
  ],
  shipping: 0,
};

const SHARE_TEXT =
  `Just about to grab some great stuff from authorizd! 🛍️ Check them out! #authorizd #shopping`;
const SHARE_URL = window.location.href;

const PLATFORMS = {
  twitter:  { label: 'X (Twitter)', shareUrl: (t, u) => `https://twitter.com/intent/tweet?text=${enc(t)}&url=${enc(u)}` },
  facebook: { label: 'Facebook',    shareUrl: (t, u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}&quote=${enc(t)}` },
  whatsapp: { label: 'WhatsApp',    shareUrl: (t, u) => `https://wa.me/?text=${enc(t + '\n' + u)}` },
  linkedin: { label: 'LinkedIn',    shareUrl: (t, u) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}&summary=${enc(t)}` },
  native:   { label: 'Other',       shareUrl: null },
};

function enc(s) { return encodeURIComponent(s); }
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

  document.getElementById('orderSubtotal').textContent = fmt(subtotal);
  document.getElementById('orderTotal').textContent    = fmt(total);
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

function handleShare(platform) {
  if (platform !== 'native') {
    const url = PLATFORMS[platform].shareUrl(SHARE_TEXT, SHARE_URL);
    window.open(url, '_blank', 'width=620,height=480,noopener,noreferrer');
  }

  if (hasShared) return;
  hasShared = true;
  applyDiscount();
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

function setupNativeShare() {
  const btn = document.getElementById('nativeShareBtn');
  if (!navigator.share) return;
  btn.classList.remove('d-none');
  btn.addEventListener('click', async () => {
    try {
      await navigator.share({ title: 'Check out authorizd!', text: SHARE_TEXT, url: SHARE_URL });
      handleShare('native');
    } catch { /* cancelled */ }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderOrder(false);
  setupNativeShare();

  document.querySelectorAll('[data-platform]').forEach(btn => {
    btn.addEventListener('click', () => handleShare(btn.dataset.platform));
  });

  document.getElementById('placeOrderBtn').addEventListener('click', () => {
    alert(`Order placed! Total charged: ${document.getElementById('placeOrderTotal').textContent}`);
  });
});
