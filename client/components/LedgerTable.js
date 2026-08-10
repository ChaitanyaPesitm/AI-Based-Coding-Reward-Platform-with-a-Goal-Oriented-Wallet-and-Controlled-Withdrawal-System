'use client';
import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';

export default function LedgerTable() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjust, setAdjust] = useState({ userId: '', amount: '', reason: '' });
  const [msg, setMsg] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);

  const fetchLedger = async () => {
    try {
      const res = await adminAPI.getLedger({ limit: 30 });
      setEntries(res.data.data);
    } catch (err) {
      console.error('Ledger fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLedger();
  }, []);

  const handleAdjust = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await adminAPI.adjustPoints(adjust);
      setMsg(`Adjusted ${adjust.amount} pts. Entry recorded to the ledger.`);
      setAdjust({ userId: '', amount: '', reason: '' });
      setShowAdjust(false);
      fetchLedger();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const badge = (type) => ({
    earn: 'rgba(16, 185, 129, 0.15)',
    spend: 'rgba(239, 68, 68, 0.15)',
    adjust: 'rgba(245, 158, 11, 0.15)'
  }[type] || 'var(--bg-secondary)');

  const badgeColor = (type) => ({
    earn: 'var(--easy)',
    spend: 'var(--hard)',
    adjust: 'var(--medium)'
  }[type] || 'var(--text-secondary)');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Every point movement is journaled here. Entries are immutable.</span>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }} onClick={() => setShowAdjust(!showAdjust)}>
          {showAdjust ? 'Close' : '+ Manual Adjustment'}
        </button>
      </div>

      {showAdjust && (
        <form onSubmit={handleAdjust} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', padding: '14px', borderRadius: '12px', background: 'var(--bg-secondary)', marginBottom: '12px' }}>
          <input className="input-field" placeholder="User ID" value={adjust.userId} onChange={(e) => setAdjust({ ...adjust, userId: e.target.value })} required />
          <input className="input-field" type="number" placeholder="Amount (+/- pts)" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} required />
          <input className="input-field" placeholder="Reason" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} required />
          <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Apply</button>
          {msg && <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>{msg}</div>}
        </form>
      )}

      {loading ? (
        <div className="spinner" style={{ margin: '20px auto' }} />
      ) : entries.length > 0 ? (
        <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Source</th>
                <th>Points</th>
                <th>Description</th>
                <th>Balance</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 600 }}>{t.user?.name || 'Unknown'}</td>
                  <td><span className="badge" style={{ background: badge(t.type), color: badgeColor(t.type), textTransform: 'capitalize' }}>{t.type}</span></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.source}</td>
                  <td style={{ fontWeight: 700, color: t.amount >= 0 ? 'var(--easy)' : 'var(--hard)' }}>{t.amount >= 0 ? '+' : ''}{t.amount}</td>
                  <td style={{ fontSize: '0.8rem' }}>{t.description}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.balanceAfter}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>No ledger entries yet.</p>
      )}
    </div>
  );
}
