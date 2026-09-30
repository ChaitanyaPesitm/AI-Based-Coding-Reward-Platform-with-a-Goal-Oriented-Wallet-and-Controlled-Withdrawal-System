'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/lib/api';

export default function LedgerTable() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjust, setAdjust] = useState({ userId: '', amount: '', reason: '' });
  const [msg, setMsg] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);

  const fetchLedger = useCallback(async () => {
    try {
      const res = await adminAPI.getLedger({ limit: 30 });
      setEntries(res.data.data);
    } catch (err) {
      console.error('Ledger fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleAdjust = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await adminAPI.adjustPoints(adjust);
      setMsg(`Adjusted ${adjust.amount} pts. Transaction journaled.`);
      setAdjust({ userId: '', amount: '', reason: '' });
      setShowAdjust(false);
      fetchLedger();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const badge = (type) => ({
    earn: 'var(--success-subtle)',
    spend: 'var(--danger-subtle)',
    adjust: 'var(--warning-subtle)'
  }[type] || 'var(--bg-secondary)');

  const badgeColor = (type) => ({
    earn: 'var(--easy)',
    spend: 'var(--hard)',
    adjust: 'var(--warning)'
  }[type] || 'var(--text-secondary)');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Immutable Transaction Journal • Double-entry credit records
        </span>
        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.75rem' }} onClick={() => setShowAdjust(!showAdjust)}>
          {showAdjust ? 'Cancel' : '+ Manual Credit Adjustment'}
        </button>
      </div>

      {showAdjust && (
        <form onSubmit={handleAdjust} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', padding: '12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
          <input className="input-field" placeholder="User ID" value={adjust.userId} onChange={(e) => setAdjust({ ...adjust, userId: e.target.value })} required />
          <input className="input-field" type="number" placeholder="Amount (+/- pts)" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} required />
          <input className="input-field" placeholder="Audit Reason" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} required />
          <button type="submit" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>Apply</button>
          {msg && <div style={{ gridColumn: '1 / -1', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>{msg}</div>}
        </form>
      )}

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading journal entries...</span>
        </div>
      ) : entries.length > 0 ? (
        <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User Account</th>
                <th>Type</th>
                <th>Source</th>
                <th>Points Change</th>
                <th>Description</th>
                <th>Balance After</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 600 }}>{t.user?.name || 'Unknown'}</td>
                  <td><span className="badge" style={{ background: badge(t.type), color: badgeColor(t.type), textTransform: 'capitalize' }}>{t.type}</span></td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.source}</td>
                  <td style={{ fontWeight: 700, color: t.amount >= 0 ? 'var(--easy)' : 'var(--hard)', fontVariantNumeric: 'tabular-nums' }}>
                    {t.amount >= 0 ? '+' : ''}{t.amount}
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>{t.description}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{t.balanceAfter}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px', fontSize: '0.82rem' }}>
          No journal entries recorded in the ledger.
        </p>
      )}
    </div>
  );
}
