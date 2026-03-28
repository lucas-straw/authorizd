import { useState } from 'react';
import { updateConfig } from '../api';

const ALL_PLATFORMS = [
  { id: 'facebook',  label: 'Facebook' },
  { id: 'twitter',   label: 'X (Twitter)' },
  { id: 'instagram', label: 'Instagram' },
];

export default function Settings({ merchant, onMerchantUpdate }) {
  const [discountPct, setDiscountPct]   = useState(merchant?.discount_percent ?? 10);
  const [platforms, setPlatforms]       = useState(merchant?.platforms ?? ['facebook']);
  const [saving, setSaving]             = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState('');

  function togglePlatform(id) {
    setPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (platforms.length === 0) {
      setError('At least one platform must be enabled.');
      return;
    }

    setSaving(true);
    try {
      const { merchant: updated } = await updateConfig({
        discount_percent: Number(discountPct),
        platforms,
      });
      onMerchantUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure the discount offered to customers and which platforms they can share on.</p>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Settings saved.</div>}

      <form onSubmit={handleSubmit} className="settings-form">

        <div className="form-card">
          <h2>Discount</h2>
          <p className="form-desc">
            The percentage off the customer's current cart total they receive for a confirmed share.
            Authorizd charges a platform fee on top of this — see your billing details in the API Keys page.
          </p>
          <label className="form-label">
            Discount percentage
            <div className="input-group">
              <input
                type="number"
                min="1"
                max="50"
                step="0.5"
                value={discountPct}
                onChange={e => setDiscountPct(e.target.value)}
                className="input-narrow"
                required
              />
              <span className="input-suffix">%</span>
            </div>
            <span className="field-hint">Recommended: 10–20%. Higher discounts drive more shares.</span>
          </label>
        </div>

        <div className="form-card">
          <h2>Platforms</h2>
          <p className="form-desc">Which social platforms customers can choose to share on.</p>
          <div className="platform-list">
            {ALL_PLATFORMS.map(({ id, label }) => (
              <label key={id} className="platform-option">
                <input
                  type="checkbox"
                  checked={platforms.includes(id)}
                  onChange={() => togglePlatform(id)}
                />
                <span>{label}</span>
                {id === 'instagram' && (
                  <span className="badge badge-info">link-only</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

      </form>
    </div>
  );
}
