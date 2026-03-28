import { useState } from 'react';
import { rotateKey } from '../api';

export default function ApiKeys({ merchant, onMerchantUpdate }) {
  const [visible, setVisible]   = useState(false);
  const [rotating, setRotating] = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);

  const apiKey = merchant?.api_key ?? '';
  const masked = apiKey.slice(0, 10) + '••••••••••••••••••••••••';

  async function handleRotate() {
    if (!confirm) { setConfirm(true); return; }
    setError('');
    setRotating(true);
    try {
      const { api_key: newKey } = await rotateKey();
      onMerchantUpdate({ ...merchant, api_key: newKey });
      setConfirm(false);
      setVisible(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setRotating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>API Keys</h1>
        <p>Use your API key to connect the Authorizd plugin to your WooCommerce or Shopify store.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-card">
        <h2>Your API key</h2>
        <p className="form-desc">
          Paste this key into the <strong>Authorizd API Key</strong> field in your plugin settings.
          Keep it secret — treat it like a password.
        </p>

        <div className="api-key-row">
          <code className="api-key-display">
            {visible ? apiKey : masked}
          </code>
          <div className="api-key-actions">
            <button className="btn btn-outline" onClick={() => setVisible(v => !v)}>
              {visible ? 'Hide' : 'Reveal'}
            </button>
            <button className="btn btn-outline" onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="key-meta">
          <span className="badge badge-green">Active</span>
          <span className="key-meta-text">
            Authorizd fee: <strong>{merchant?.fee_percent ?? 20}%</strong> of each discount given
          </span>
        </div>
      </div>

      <div className="form-card form-card-danger">
        <h2>Rotate API key</h2>
        <p className="form-desc">
          Rotating generates a new key immediately. Your old key stops working right away —
          you'll need to update it in your plugin settings.
        </p>

        {confirm ? (
          <div className="confirm-row">
            <span className="confirm-text">Are you sure? Your current key will stop working immediately.</span>
            <button className="btn btn-danger" onClick={handleRotate} disabled={rotating}>
              {rotating ? 'Rotating…' : 'Yes, rotate key'}
            </button>
            <button className="btn btn-outline" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-outline-danger" onClick={handleRotate}>
            Rotate key
          </button>
        )}
      </div>

      <div className="form-card">
        <h2>Integration guide</h2>
        <ol className="install-steps">
          <li>Download the <strong>authorizd-social-share</strong> plugin ZIP from your Authorizd account.</li>
          <li>In WordPress, go to <strong>Plugins → Add New → Upload Plugin</strong> and install the ZIP.</li>
          <li>Go to <strong>WooCommerce → Authorizd</strong> and paste your API key above.</li>
          <li>Add your <strong>Facebook App ID</strong> and choose which platforms to enable.</li>
          <li>Save — the share widget will appear above your checkout form automatically.</li>
        </ol>
      </div>
    </div>
  );
}
