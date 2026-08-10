'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { walletAPI, withdrawalsAPI } from '@/lib/api';
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

  const fetchData = async () => {
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
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [user]);

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
        message: err.response?.data?.message || 'Withdrawal failed'
      });
    } finally {
      setWithdrawing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  const activeGoal = wallet?.activeGoal;
  const canWithdraw = activeGoal?.canWithdraw;

  return (
    <div className="bg-grid" style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
      <div className="bg-glow-orb" style={{ top: '10%', right: '15%', background: 'var(--accent-tertiary)' }} />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <div className="animate-fade-in-up" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            💰 Your <span className="gradient-text">Wallet</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Track your earnings, generate goal certificates, and manage withdrawals
          </p>
        </div>

        {/* Wallet Overview Cards */}
        <div className="animate-fade-in-up delay-100" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(59, 130, 246, 0.05))',
            border: '1px solid rgba(108, 99, 255, 0.15)'
          }}>
            <span className="stat-label">Total Points</span>
            <span className="stat-value gradient-text">{wallet?.totalPoints?.toLocaleString() || 0}</span>
          </div>
          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))',
            border: '1px solid rgba(16, 185, 129, 0.15)'
          }}>
            <span className="stat-label">Wallet Balance</span>
            <span className="stat-value" style={{ color: 'var(--easy)' }}>₹{wallet?.currencyEquivalent?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Problems Solved</span>
            <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>{wallet?.problemsSolved || 0}</span>
          </div>
        </div>

        {/* Goal Progress + Withdraw + Certificate */}
        {activeGoal && (
          <div className="glass-card animate-fade-in-up delay-200" style={{ padding: '28px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>🎯 Goal: {activeGoal.title}</h2>
                <span className={`badge badge-${activeGoal.category === 'laptop' ? 'medium' : 'easy'}`} style={{ marginTop: '6px', display: 'inline-block' }}>
                  {activeGoal.category}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900 }} className="gradient-text">
                  {activeGoal.progressPercentage}%
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ₹{activeGoal.currencyEquivalent?.toFixed(2)} / ₹{activeGoal.targetCurrency?.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="progress-bar-bg" style={{ height: '16px' }}>
              <div className="progress-bar-fill" style={{
                width: `${activeGoal.progressPercentage}%`,
                background: canWithdraw ? 'var(--gradient-success)' : 'var(--gradient-primary)'
              }} />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {activeGoal.currentPoints?.toLocaleString()} / {activeGoal.targetAmount?.toLocaleString()} points
              </span>

              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Certificate PDF Generator Button */}
                <button
                  className="btn-secondary"
                  onClick={() => setShowCertModal(true)}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  🎓 Goal Certificate (PDF)
                </button>

                <button
                  className={canWithdraw ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => canWithdraw && setShowWithdrawModal(true)}
                  disabled={!canWithdraw}
                  style={{
                    opacity: canWithdraw ? 1 : 0.5,
                    cursor: canWithdraw ? 'pointer' : 'not-allowed'
                  }}
                >
                  {canWithdraw ? '🎉 Withdraw Now' : '🔒 Locked (Goal Incomplete)'}
                </button>
              </div>
            </div>

            {!canWithdraw && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center' }}>
                You need {(activeGoal.targetAmount - activeGoal.currentPoints).toLocaleString()} more points to unlock withdrawal
              </p>
            )}
          </div>
        )}

        {/* Transaction History */}
        <div className="glass-card animate-fade-in-up delay-300" style={{ padding: '24px', marginBottom: '28px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>📊 Transaction History</h3>

          {history.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th>Language</th>
                    <th>AI Score</th>
                    <th>Points</th>
                    <th>Date</th>
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
                            {tx.source === 'withdrawal' ? '💰 withdrawal' : tx.source || 'system'}
                          </span>
                        )}
                      </td>
                      <td>
                        {tx.aiScore ? (
                          <span style={{ color: tx.aiScore >= 70 ? 'var(--easy)' : tx.aiScore >= 40 ? 'var(--medium)' : 'var(--hard)', fontWeight: 600 }}>
                            {tx.aiScore}/100
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: tx.type === 'spent' ? 'var(--hard)' : 'var(--easy)' }}>
                          {tx.type === 'spent' ? '-' : '+'}{tx.points}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '4px' }}>(₹{tx.currency?.toFixed(2)})</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
              No transactions yet. Start solving problems to earn points!
            </p>
          )}
        </div>

        {/* Withdrawal History */}
        {withdrawals.length > 0 && (
          <div className="glass-card animate-fade-in-up delay-400" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>📋 Withdrawal Requests</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {withdrawals.map(w => (
                <div key={w._id} style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.goal?.title || 'Goal'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {w.pointsAmount?.toLocaleString()} pts → ₹{w.currencyAmount?.toFixed(2)}
                    </div>
                  </div>
                  <span className="badge" style={{
                    background: w.status === 'approved' || w.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' :
                                w.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' :
                                'rgba(245, 158, 11, 0.15)',
                    color: w.status === 'approved' || w.status === 'completed' ? 'var(--easy)' :
                           w.status === 'rejected' ? 'var(--hard)' :
                           'var(--medium)'
                  }}>
                    {w.status}
                  </span>
                </div>
              ))}
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

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => !withdrawing && setShowWithdrawModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {withdrawResult ? (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>{withdrawResult.success ? '🎉' : '❌'}</span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '12px' }}>
                  {withdrawResult.success ? 'Withdrawal Requested!' : 'Withdrawal Failed'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.9rem' }}>
                  {withdrawResult.message}
                </p>
                <button
                  className="btn-primary"
                  style={{ marginTop: '20px', width: '100%' }}
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawResult(null);
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '6px' }}>💸 Request Withdrawal</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                  Your goal is complete! Enter your UPI ID to receive ₹{activeGoal?.targetCurrency?.toFixed(2)}
                </p>

                <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-secondary)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Goal:</span>
                    <span style={{ fontWeight: 600 }}>{activeGoal?.title}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Points:</span>
                    <span style={{ fontWeight: 600 }}>{activeGoal?.targetAmount?.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Amount:</span>
                    <span style={{ fontWeight: 700, color: 'var(--easy)' }}>₹{activeGoal?.targetCurrency?.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    UPI ID
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
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
                    disabled={withdrawing}
                  >
                    {withdrawing ? 'Processing...' : 'Confirm Withdrawal'}
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
