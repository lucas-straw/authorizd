import { useEffect, useState, useCallback } from 'react';
import { getEvents } from '../api';

const fmt     = v => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = s => new Date(s).toLocaleString();
const PLATFORM_LABELS = { facebook: 'Facebook', twitter: 'X (Twitter)', instagram: 'Instagram' };
const PAGE_SIZE = 25;

export default function Events() {
  const [events, setEvents]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const load = useCallback(async (p) => {
    setLoading(true);
    setError('');
    try {
      const data = await getEvents(PAGE_SIZE, p * PAGE_SIZE);
      setEvents(data.events);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Share Log</h1>
        <p>Every confirmed social share event across your store — {total.toLocaleString()} total.</p>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {loading && <div className="loading">Loading…</div>}

      {!loading && events.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">🔗</div>
          <h3>No share events yet</h3>
          <p>When customers share their cart and receive a discount, each event appears here.</p>
        </div>
      )}

      {events.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order ref</th>
                  <th>Platform</th>
                  <th className="num">Cart value</th>
                  <th className="num">Discount %</th>
                  <th className="num">Discount given</th>
                  <th className="num">Authorizd fee</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td className="td-date">{fmtDate(ev.created_at)}</td>
                    <td><code className="order-ref">{ev.order_ref}</code></td>
                    <td>
                      <span className={'badge-platform badge-' + ev.platform}>
                        {PLATFORM_LABELS[ev.platform] || ev.platform}
                      </span>
                    </td>
                    <td className="num">{fmt(ev.cart_value)}</td>
                    <td className="num">{ev.discount_pct}%</td>
                    <td className="num text-green">{fmt(ev.discount_amount)}</td>
                    <td className="num text-muted">{fmt(ev.platform_fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
              >
                ← Previous
              </button>
              <span className="page-info">
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
