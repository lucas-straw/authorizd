import { useEffect, useState } from 'react';
import { getSummary } from '../api';
import StatCard from '../components/StatCard';

const fmt = v => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PLATFORM_LABELS = { facebook: 'Facebook', twitter: 'X (Twitter)', instagram: 'Instagram' };

export default function Overview({ merchant }) {
  const [summary, setSummary] = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch(err => setError(err.message));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Overview</h1>
        <p>Welcome back, <strong>{merchant?.shop_name}</strong>. Here's how your social share program is performing.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!summary && !error && <div className="loading">Loading analytics…</div>}

      {summary && (
        <>
          <section>
            <h2 className="section-title">Last 30 days</h2>
            <div className="stat-grid">
              <StatCard
                label="Total shares"
                value={summary.last_30_days.total_shares.toLocaleString()}
                sub="confirmed social posts"
                accent
              />
              <StatCard
                label="Discounts given"
                value={fmt(summary.last_30_days.total_discount_given)}
                sub="total savings for customers"
              />
              <StatCard
                label="Authorizd fees"
                value={fmt(summary.last_30_days.total_platform_fees)}
                sub="owed this billing period"
              />
            </div>
          </section>

          <section>
            <h2 className="section-title">All time</h2>
            <div className="stat-grid">
              <StatCard
                label="Total shares"
                value={summary.all_time.total_shares.toLocaleString()}
              />
              <StatCard
                label="Discounts given"
                value={fmt(summary.all_time.total_discount_given)}
              />
              <StatCard
                label="Authorizd fees"
                value={fmt(summary.all_time.total_platform_fees)}
              />
            </div>
          </section>

          {summary.by_platform.length > 0 && (
            <section>
              <h2 className="section-title">By platform</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th className="num">Shares</th>
                      <th className="num">Discounts given</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.by_platform.map(row => (
                      <tr key={row.platform}>
                        <td>{PLATFORM_LABELS[row.platform] || row.platform}</td>
                        <td className="num">{row.shares.toLocaleString()}</td>
                        <td className="num">{fmt(row.discount_given)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {summary.all_time.total_shares === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🚀</div>
              <h3>No shares yet</h3>
              <p>Install the plugin on your store and your first share event will appear here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
