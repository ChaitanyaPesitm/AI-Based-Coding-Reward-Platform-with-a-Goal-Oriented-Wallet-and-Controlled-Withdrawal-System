'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { walletAPI, withdrawalsAPI, goalsAPI } from '@/lib/api';
import CertificateModal from '@/components/CertificateModal';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, historyRes, withdrawRes] = await Promise.all([
        walletAPI.getOverview(),
        walletAPI.getHistory(),
        withdrawalsAPI.getAll()
      ]);
      setWallet(walletRes.data.data);
      setHistory(historyRes.data.data);
      setWithdrawals(withdrawRes.data.data);
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleResetGoal = async () => {
    if (!wallet?.activeGoal) return;
    if (!window.confirm('Reset goal progress to 0 points? This cannot be undone.')) return;
    try {
      await goalsAPI.reset(wallet.activeGoal.id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset goal');
    }
  };

  const handleWithdraw = async () => {
    if (!wallet?.activeGoal) return;
    setWithdrawing(true);
    try {
      const res = await withdrawalsAPI.request({
        goalId: wallet.activeGoal.id,
        paymentMethod: 'upi',
        upiId
      });
      setWithdrawResult(res.data);
      fetchData();
    } catch (err) {
      setWithdrawResult({
        success: false,
        message: err.response?.data?.message || 'Withdrawal failed. Check eligibility constraints.'
      });
    } finally {
      setWithdrawing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Retrieving ledger and wallet balances...</span>
      </div>
    );
  }

  if (!user) return null;

  const activeGoal = wallet?.activeGoal;
  const canWithdraw = activeGoal?.canWithdraw;

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Section Header */}
        <div style={{
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '16px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Financial Ledger • Controlled Disbursement
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
            Student Reward Wallet
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
            View accumulated credits, generate completion certificates, and submit audited withdrawal requests.
          </p>
        </div>

        {/* 3 Metric Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '24px'
        }}>
          <div className="stat-card">
            <span className="stat-label">Total Points Earned</span>
            <span className="stat-value" style={{ color: 'var(--primary)' }}>
              {wallet?.totalPoints?.toLocaleString() || 0}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Wallet Balance (INR)</span>
            <span className="stat-value" style={{ color: 'var(--easy)' }}>
              ₹{wallet?.currencyEquivalent?.toFixed(2) || '0.00'}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Verified Solves</span>
            <span className="stat-value" style={{ color: 'var(--text-primary)' }}>
              {wallet?.problemsSolved || 0}
            </span>
          </div>
        </div>

        {/* Active Goal Module */}
        {activeGoal && (
          <div className="panel-card" style={{ padding: '22px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                    Active Financial Milestone
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', textTransform: 'capitalize' }}>
                    {activeGoal.category}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {activeGoal.title}
                </h2>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: canWithdraw ? 'var(--easy)' : 'var(--primary)' }}>
                  {activeGoal.progressPercentage}% Complete
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ₹{activeGoal.currencyEquivalent?.toFixed(2)} of ₹{activeGoal.targetCurrency?.toFixed(2)} Target
                </div>
              </div>
            </div>

            <div className="progress-bar-bg" style={{ height: '10px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, activeGoal.progressPercentage)}%`,
                  background: canWithdraw ? 'var(--easy)' : 'var(--primary)'
                }}
              />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Progress: <strong>{activeGoal.currentPoints?.toLocaleString()}</strong> / {activeGoal.targetAmount?.toLocaleString()} points
              </span>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowCertModal(true)}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Generate PDF Certificate
                </button>

                <button
                  className="btn-secondary"
                  onClick={handleResetGoal}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Reset Milestone
                </button>

                <button
                  className={canWithdraw ? 'btn-success' : 'btn-secondary'}
                  onClick={() => canWithdraw && setShowWithdrawModal(true)}
                  disabled={!canWithdraw}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    opacity: canWithdraw ? 1 : 0.5,
                    cursor: canWithdraw ? 'pointer' : 'not-allowed'
                  }}
                >
                  {canWithdraw ? 'Submit Withdrawal Request' : 'Locked (Target Incomplete)'}
                </button>
              </div>
            </div>

            {!canWithdraw && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                color: 'var(--text-muted)'
              }}>
                Disbursement Policy: An additional {(activeGoal.targetAmount - activeGoal.currentPoints).toLocaleString()} points required to reach 100% threshold for withdrawal unlocking.
              </div>
            )}
          </div>
        )}

        {/* Transaction History Table */}
        <div className="panel-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '14px' }}>
            Verified Ledger Transactions
          </div>

          {history.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Runtime / Source</th>
                    <th>AI Evaluation</th>
                    <th>Points Movement</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600 }}>{tx.description}</td>
                      <td>
                        {tx.language ? (
                          <span className={`badge-lang badge-${tx.language}`}>{tx.language}</span>
                        ) : (
                          <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                            {tx.source === 'withdrawal' ? 'Withdrawal' : tx.source || 'System'}
                          </span>
                        )}
                      </td>
                      <td>
                        {tx.aiScore ? (
                          <span style={{ color: tx.aiScore >= 70 ? 'var(--easy)' : tx.aiScore >= 40 ? 'var(--warning)' : 'var(--hard)', fontWeight: 600 }}>
                            {tx.aiScore}/100
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: tx.type === 'spent' ? 'var(--hard)' : 'var(--easy)' }}>
                          {tx.type === 'spent' ? '-' : '+'}{tx.points} pts
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '6px' }}>
                          (₹{tx.currency?.toFixed(2)})
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No transactions recorded in the reward ledger.
            </div>
          )}
        </div>

        {/* Withdrawal History Table */}
        {withdrawals.length > 0 && (
          <div className="panel-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '14px' }}>
              Disbursement Requests & Audit Log
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {withdrawals.map(w => {
                const isApproved = w.status === 'approved' || w.status === 'completed';
                const isRejected = w.status === 'rejected';
                return (
                  <div key={w._id} style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {w.goal?.title || 'Milestone Withdrawal'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {w.pointsAmount?.toLocaleString()} points → ₹{w.currencyAmount?.toFixed(2)} (Method: {w.paymentMethod?.toUpperCase() || 'UPI'})
                      </div>
                    </div>
                    <span className="badge" style={{
                      background: isApproved ? 'var(--success-subtle)' : isRejected ? 'var(--danger-subtle)' : 'var(--warning-subtle)',
                      color: isApproved ? 'var(--easy)' : isRejected ? 'var(--hard)' : 'var(--warning)',
                      border: `1px solid ${isApproved ? 'var(--success-border)' : isRejected ? 'var(--danger-border)' : 'var(--warning-border)'}`,
                      textTransform: 'uppercase'
                    }}>
                      {w.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Certificate Modal */}
      {showCertModal && (
        <CertificateModal
          user={user}
          goal={activeGoal}
          onClose={() => setShowCertModal(false)}
        />
      )}

      {/* Withdrawal Request Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => !withdrawing && setShowWithdrawModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {withdrawResult ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: withdrawResult.success ? 'var(--success-subtle)' : 'var(--danger-subtle)',
                  color: withdrawResult.success ? 'var(--easy)' : 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: '1.2rem',
                  fontWeight: 700
                }}>
                  {withdrawResult.success ? '✓' : '✕'}
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {withdrawResult.success ? 'Disbursement Request Submitted' : 'Request Denied'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.85rem' }}>
                  {withdrawResult.message}
                </p>
                <button
                  className="btn-primary"
                  style={{ marginTop: '18px', width: '100%' }}
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawResult(null);
                  }}
                >
                  Close Window
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                    Payout Authorization
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    Request Milestone Payout
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                    Your goal milestone has achieved 100% verification. Provide payment details for transfer.
                  </p>
                </div>

                <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Verified Milestone:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeGoal?.title}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Accumulated Points:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeGoal?.targetAmount?.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Settlement Amount:</span>
                    <span style={{ fontWeight: 700, color: 'var(--easy)' }}>₹{activeGoal?.targetCurrency?.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                    Beneficiary UPI Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="student@okhdfcbank or 9876543210@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Payouts are reviewed through automated anti-fraud checks before administrative disbursement.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowWithdrawModal(false)}
                    disabled={withdrawing}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleWithdraw}
                    disabled={withdrawing || !upiId.trim()}
                  >
                    {withdrawing ? 'Submitting...' : 'Authorize Disbursement'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
