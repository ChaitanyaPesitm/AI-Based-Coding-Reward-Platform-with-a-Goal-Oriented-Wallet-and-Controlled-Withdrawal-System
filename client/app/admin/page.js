'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { problemsAPI, withdrawalsAPI, settingsAPI, submissionsAPI, adminAPI, fraudAPI } from '@/lib/api';
import LedgerTable from '@/components/LedgerTable';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('problems');
  const [problems, setProblems] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [violators, setViolators] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [fraudCases, setFraudCases] = useState([]);
  const [ads, setAds] = useState([]);
  const [showAddAd, setShowAddAd] = useState(false);
  const [adForm, setAdForm] = useState({
    sponsor: '', title: '', description: '', url: '', cta: '', badge: '',
    category: 'laptop', rewardPoints: 10, rewardCooldownHours: 24
  });
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [problemForm, setProblemForm] = useState({
    title: '', description: '', difficulty: 'easy', basePoints: 100,
    language: 'c', starterCode: '', constraints: '', sampleInput: '', sampleOutput: '',
    testCases: [{ input: '', expectedOutput: '' }]
  });
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const [probRes, wdRes, settingsRes, violRes, anaRes, fraudRes, adsRes] = await Promise.all([
        problemsAPI.getAll(),
        withdrawalsAPI.getAllAdmin({}).catch(() => ({ data: { data: [] } })),
        settingsAPI.get().catch(() => ({ data: { data: { proctoringEnabled: true } } })),
        submissionsAPI.getViolators().catch(() => ({ data: { data: [] } })),
        adminAPI.getAnalytics().catch(() => ({ data: { data: null } })),
        fraudAPI.getCases({}).catch(() => ({ data: { data: [] } })),
        adminAPI.getAds().catch(() => ({ data: { data: [] } }))
      ]);
      setProblems(probRes.data.data);
      setWithdrawals(wdRes.data.data);
      setProctoringEnabled(settingsRes.data.data?.proctoringEnabled !== false);
      setViolators(violRes.data.data);
      setAnalytics(anaRes.data.data);
      setFraudCases(fraudRes.data.data);
      setAds(adsRes.data.data);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [user]);

  const handleAddProblem = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const validTestCases = problemForm.testCases.filter(tc => tc.input && tc.expectedOutput);
      if (validTestCases.length === 0) {
        setFormError('At least one test case is required');
        return;
      }
      await problemsAPI.create({ ...problemForm, testCases: validTestCases });
      setShowAddProblem(false);
      setProblemForm({
        title: '', description: '', difficulty: 'easy', basePoints: 100,
        language: 'c', starterCode: '', constraints: '', sampleInput: '', sampleOutput: '',
        testCases: [{ input: '', expectedOutput: '' }]
      });
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create problem');
    }
  };

  const handleApprove = async (id) => {
    try {
      await withdrawalsAPI.approve(id, 'Approved by admin');
      fetchData();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleReject = async (id) => {
    try {
      await withdrawalsAPI.reject(id, 'Rejected by admin');
      fetchData();
    } catch (err) {
      console.error('Rejection failed:', err);
    }
  };

  const addTestCase = () => {
    setProblemForm({
      ...problemForm,
      testCases: [...problemForm.testCases, { input: '', expectedOutput: '' }]
    });
  };

  const updateTestCase = (index, field, value) => {
    const newTestCases = [...problemForm.testCases];
    newTestCases[index][field] = value;
    setProblemForm({ ...problemForm, testCases: newTestCases });
  };

  const removeTestCase = (index) => {
    if (problemForm.testCases.length <= 1) return;
    const newTestCases = problemForm.testCases.filter((_, i) => i !== index);
    setProblemForm({ ...problemForm, testCases: newTestCases });
  };

  const handleToggleProctoring = async () => {
    try {
      const next = !proctoringEnabled;
      await settingsAPI.update({ proctoringEnabled: next });
      setProctoringEnabled(next);
    } catch (err) {
      console.error('Failed to update proctoring setting:', err);
    }
  };

  const handleFraudScan = async () => {
    try {
      await fraudAPI.scan();
      const res = await fraudAPI.getCases({});
      setFraudCases(res.data.data);
    } catch (err) {
      console.error('Fraud scan failed:', err);
    }
  };

  const handleFraudReview = async (id, status, notes) => {
    try {
      await fraudAPI.review(id, { status, notes });
      const res = await fraudAPI.getCases({});
      setFraudCases(res.data.data);
    } catch (err) {
      console.error('Fraud review failed:', err);
    }
  };

  const handleAdjustPoints = async (userId, amount, reason) => {
    if (!amount || !reason) return;
    try {
      await adminAPI.adjustPoints({ userId, amount: parseInt(amount), reason });
      fetchData();
    } catch (err) {
      console.error('Adjustment failed:', err);
    }
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createAd(adForm);
      setShowAddAd(false);
      setAdForm({
        sponsor: '', title: '', description: '', url: '', cta: '', badge: '',
        category: 'laptop', rewardPoints: 10, rewardCooldownHours: 24
      });
      fetchData();
    } catch (err) {
      console.error('Ad creation failed:', err);
    }
  };

  const handleToggleAd = async (ad) => {
    try {
      await adminAPI.updateAd(ad._id, { isActive: !ad.isActive });
      fetchData();
    } catch (err) {
      console.error('Ad toggle failed:', err);
    }
  };

  const handleDeleteAd = async (id) => {
    try {
      await adminAPI.deleteAd(id);
      fetchData();
    } catch (err) {
      console.error('Ad delete failed:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <div className="bg-grid" style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <div className="animate-fade-in-up" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            ⚙️ Admin <span className="gradient-text">Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage problems, review withdrawals, and monitor platform activity
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {['problems', 'withdrawals', 'analytics', 'fraud', 'ads', 'violators', 'settings'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: tab === t ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: tab === t ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize'
              }}
            >
              {t === 'problems' ? '💻 ' : t === 'withdrawals' ? '📋 ' : t === 'analytics' ? '📊 ' : t === 'fraud' ? '🔍 ' : t === 'ads' ? '📣 ' : t === 'violators' ? '🛡️ ' : '⚙️ '}{t}
              {t === 'withdrawals' && withdrawals.filter(w => w.status === 'pending' || w.status === 'verified').length > 0 && (
                <span style={{
                  marginLeft: '6px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'var(--hard)',
                  color: 'white',
                  fontSize: '0.7rem'
                }}>
                  {withdrawals.filter(w => w.status === 'pending' || w.status === 'verified').length}
                </span>
              )}
              {t === 'violators' && violators.length > 0 && (
                <span style={{
                  marginLeft: '6px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'var(--hard)',
                  color: 'white',
                  fontSize: '0.7rem'
                }}>
                  {violators.length}
                </span>
              )}
              {t === 'fraud' && fraudCases.filter(f => f.status === 'open' || f.status === 'flagged').length > 0 && (
                <span style={{
                  marginLeft: '6px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'var(--hard)',
                  color: 'white',
                  fontSize: '0.7rem'
                }}>
                  {fraudCases.filter(f => f.status === 'open' || f.status === 'flagged').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Problems Tab */}
        {tab === 'problems' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700 }}>{problems.length} Problems</h3>
              <button className="btn-primary" onClick={() => setShowAddProblem(true)} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                + Add Problem
              </button>
            </div>

            <div className="glass-card" style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Language</th>
                    <th>Difficulty</th>
                    <th>Base Points</th>
                    <th>Test Cases</th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 600 }}>{p.title}</td>
                      <td><span className={`badge-lang badge-${p.language}`}>{p.language}</span></td>
                      <td><span className={`badge badge-${p.difficulty}`}>{p.difficulty}</span></td>
                      <td style={{ fontWeight: 600 }}>{p.basePoints}</td>
                      <td>{p.testCases?.length || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Withdrawals Tab */}
        {tab === 'withdrawals' && (
          <div className="animate-fade-in">
            <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Withdrawal Requests</h3>

            {withdrawals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {withdrawals.map(w => (
                  <div key={w._id} className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{w.user?.name || 'User'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>{w.user?.email}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          Goal: <strong>{w.goal?.title || 'N/A'}</strong> ({w.goal?.category})
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Amount: <strong style={{ color: 'var(--easy)' }}>{w.pointsAmount?.toLocaleString()} pts → ₹{w.currencyAmount?.toFixed(2)}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Fraud Score: <span style={{ color: w.fraudScore > 30 ? 'var(--hard)' : 'var(--easy)', fontWeight: 600 }}>{w.fraudScore}/100</span>
                          {w.fraudDetails?.suspiciousPatterns && ` — ${w.fraudDetails.suspiciousPatterns}`}
                        </div>
                        {w.upiId && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            UPI: <strong>{w.upiId}</strong>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span className="badge" style={{
                          background: w.status === 'approved' || w.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' :
                                      w.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: w.status === 'approved' || w.status === 'completed' ? 'var(--easy)' :
                                 w.status === 'rejected' ? 'var(--hard)' : 'var(--medium)'
                        }}>
                          {w.status}
                        </span>

                        {(w.status === 'pending' || w.status === 'verified') && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleApprove(w._id)}
                              style={{
                                padding: '6px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'var(--gradient-success)',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              ✓ Approve
                            </button>
                            <button className="btn-danger" style={{ padding: '6px 16px', fontSize: '0.8rem' }} onClick={() => handleReject(w._id)}>
                              ✕ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No withdrawal requests yet.
              </div>
            )}
          </div>
        )}

        {/* Violators Tab */}
        {tab === 'violators' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontWeight: 700 }}>🛡️ Proctoring Violators</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Students with submissions flagged for tab-switching, copy/paste, shortcuts, or idle time
              </span>
            </div>

            {violators.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {violators.map(v => (
                  <div key={v.userId} className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{v.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>{v.email}</div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
                          <span className="badge" style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: 'var(--hard)',
                            fontWeight: 700
                          }}>
                            ⚠️ {v.flaggedCount} flagged submission{v.flaggedCount !== 1 ? 's' : ''}
                          </span>
                          <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--medium)' }}>
                            🚫 {v.totalViolations} violation{v.totalViolations !== 1 ? 's' : ''}
                          </span>
                          <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                            📅 {new Date(v.lastFlaggedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {v.problems && v.problems.length > 0 && (
                          <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {v.problems.map((p, i) => (
                              <span key={i} style={{
                                fontSize: '0.72rem',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)'
                              }}>
                                {p.title} <span className={`badge-lang badge-${p.language}`}>{p.language}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '2.5rem' }}>🛡️</span>
                <p style={{ marginTop: '10px' }}>No proctoring violations recorded yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <div className="animate-fade-in">
            {analytics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Summary stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div className="stat-card">
                    <span className="stat-label">👥 Users</span>
                    <span className="stat-value">{analytics.users?.total}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+{analytics.users?.newToday} today</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">📝 Submissions</span>
                    <span className="stat-value">{analytics.submissions?.total}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{analytics.submissions?.today} today</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">✅ Acceptance Rate</span>
                    <span className="stat-value" style={{ color: 'var(--easy)' }}>{analytics.submissions?.acceptanceRate}%</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{analytics.submissions?.accepted} accepted</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">💎 Points Distributed</span>
                    <span className="stat-value gradient-text">{analytics.points?.distributed?.toLocaleString()}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{analytics.points?.last7dEarned?.toLocaleString()} last 7d</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">💸 Withdrawn</span>
                    <span className="stat-value" style={{ color: 'var(--medium)' }}>{analytics.points?.withdrawn?.toLocaleString()}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{analytics.withdrawals?.pending} pending, {analytics.withdrawals?.verified} verified</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">🤖 AI Failures</span>
                    <span className="stat-value" style={{ color: analytics.submissions?.aiFailures > 0 ? 'var(--hard)' : 'var(--easy)' }}>{analytics.submissions?.aiFailures}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>tests passed but no AI score</span>
                  </div>
                </div>

                {/* 14-day series */}
                {analytics.series?.submissions?.length > 0 && (
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>📈 Activity (last 14 days)</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '10px', overflowX: 'auto' }}>
                      {analytics.series.submissions.map((d, i) => {
                        const max = Math.max(1, ...analytics.series.submissions.map(x => x.count));
                        const pts = analytics.series.points[i]?.pts || 0;
                        return (
                          <div key={d.date} title={`${d.date}: ${d.count} submissions, ${pts} pts`} style={{ flex: '1 0 auto', minWidth: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', alignItems: 'center', gap: '2px' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{d.count}</div>
                            <div style={{
                              width: '100%', borderRadius: '4px 4px 0 0',
                              height: `${Math.max(4, (d.count / max) * 100)}%`,
                              background: 'var(--accent-primary)'
                            }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Most solved + most difficult */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>🏆 Most Solved</h3>
                    {analytics.mostSolved?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {analytics.mostSolved.map(p => {
                          const max = Math.max(1, ...analytics.mostSolved.map(x => x.accepted));
                          return (
                            <div key={p._id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 600 }}>{p.title}</span>
                                <span style={{ color: 'var(--text-muted)' }}>{p.accepted} solves</span>
                              </div>
                              <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${(p.accepted / max) * 100}%`, background: 'var(--easy)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No solves yet</p>}
                  </div>

                  <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>🥵 Most Difficult</h3>
                    {analytics.mostDifficult?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {analytics.mostDifficult.map(p => (
                          <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                            <span style={{ fontWeight: 600 }}>{p.title}</span>
                            <span>
                              <span style={{ color: 'var(--hard)', fontWeight: 700 }}>{Math.round(p.acceptRate)}%</span>
                              <span style={{ color: 'var(--text-muted)' }}> ({p.accepted}/{p.attempts})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not enough data</p>}
                  </div>
                </div>

                {/* Ledger audit */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>🧾 Reward Ledger (latest entries)</h3>
                  <LedgerTable />
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '2.5rem' }}>📊</span>
                <p style={{ marginTop: '10px' }}>Analytics unavailable.</p>
              </div>
            )}
          </div>
        )}

        {/* Fraud Tab */}
        {tab === 'fraud' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontWeight: 700 }}>🔍 Fraud Cases</h3>
              <button className="btn-secondary" onClick={handleFraudScan} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                🔄 Rescan All Users
              </button>
            </div>

            {fraudCases.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fraudCases.map(c => (
                  <div key={c._id} className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{c.user?.name || 'User'}</span>
                          <span className={`badge ${c.level === 'clean' ? 'badge-easy' : c.level === 'attention' ? 'badge-medium' : 'badge-hard'}`} style={{ textTransform: 'capitalize' }}>
                            {c.level}
                          </span>
                          <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                            {c.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {c.user?.email} • {c.user?.problemsSolved} solved • {c.user?.totalPointsEarned} pts
                        </div>
                        {c.reasons?.length > 0 && (
                          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {c.reasons.filter(r => r.points > 0).map((r, i) => (
                              <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                <span>{r.detail}</span>
                                <span style={{ fontWeight: 800, color: 'var(--hard)', whiteSpace: 'nowrap' }}>+{r.points}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {c.adminNotes && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>📝 {c.adminNotes}</div>
                        )}
                      </div>

                      {/* Fraud score dial */}
                      <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
                        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '72px', height: '72px' }}>
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg-secondary)" strokeWidth="3.6" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={c.score >= 50 ? 'var(--hard)' : c.score >= 25 ? '#f59e0b' : 'var(--easy)'}
                            strokeWidth="3.6" strokeDasharray={`${c.score} 100`} strokeLinecap="round"
                          />
                        </svg>
                        <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                          {c.score}
                        </div>
                      </div>
                    </div>

                    {/* Review actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                      <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }} onClick={() => handleFraudReview(c._id, 'cleared', 'Reviewed — cleared by admin')}>
                        ✅ Clear
                      </button>
                      <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }} onClick={() => handleFraudReview(c._id, 'reviewed', 'Reviewed — keeping an eye on account')}>
                        👁️ Mark Reviewed
                      </button>
                      <button style={{
                        padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px', border: 'none',
                        background: 'rgba(239, 68, 68, 0.15)', color: 'var(--hard)', fontWeight: 600, cursor: 'pointer'
                      }} onClick={() => handleFraudReview(c._id, 'flagged', 'Confirmed fraud — flagged for penalty')}>
                        🚩 Flag as Fraud
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '2.5rem' }}>🔍</span>
                <p style={{ marginTop: '10px' }}>No fraud cases yet. Run a scan to evaluate all users.</p>
              </div>
            )}
          </div>
        )}

        {/* Ads Tab */}
        {tab === 'ads' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontWeight: 700 }}>📣 Manage Ads</h3>
              <button className="btn-primary" onClick={() => setShowAddAd(true)} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                + Add Ad
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ads.length > 0 ? ads.map(ad => (
                <div key={ad._id} className="glass-card" style={{ padding: '18px 20px', opacity: ad.isActive ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ad.title}</span>
                        <span className={`badge badge-${ad.category}`}>{ad.category}</span>
                        {ad.rewardPoints > 0 && (
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--easy)' }}>
                            🎁 +{ad.rewardPoints} pts
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        by {ad.sponsor} • {ad.url}
                      </div>
                      {ad.description && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{ad.description}</div>
                      )}
                      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>👁 {ad.impressions} impressions</span>
                        <span>🖱 {ad.clicks} clicks</span>
                        <span>📈 CTR {ad.ctr}%</span>
                        <span>🎁 {ad.rewardClaims} rewarded</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                        onClick={() => handleToggleAd(ad)}
                      >
                        {ad.isActive ? '🟢 Active' : '⚪ Disabled'}
                      </button>
                      <button
                        style={{
                          padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px', border: 'none',
                          background: 'rgba(239, 68, 68, 0.12)', color: 'var(--hard)', fontWeight: 600, cursor: 'pointer'
                        }}
                        onClick={() => handleDeleteAd(ad._id)}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '2.5rem' }}>📣</span>
                  <p style={{ marginTop: '10px' }}>No ads yet. Create your first sponsored ad.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="animate-fade-in">
            <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Platform Settings</h3>

            <div className="glass-card" style={{ padding: '24px', maxWidth: '680px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>🛡️ Proctoring Mode</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.6 }}>
                    When enabled, students must start a proctored session before solving problems. It monitors
                    tab-switching, window blur, copy/paste, right-click, and keyboard shortcuts, and flags submissions
                    that accumulate violations.
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '10px', fontWeight: 600, color: proctoringEnabled ? 'var(--easy)' : 'var(--hard)' }}>
                    {proctoringEnabled
                      ? '● Proctoring is currently ENABLED for all problem-solving sessions'
                      : '○ Proctoring is currently DISABLED — students can solve without monitoring'}
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={proctoringEnabled}
                  aria-label="Toggle proctoring mode"
                  onClick={handleToggleProctoring}
                  style={{
                    width: '58px',
                    height: '32px',
                    flexShrink: 0,
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    background: proctoringEnabled ? 'var(--gradient-success)' : 'var(--bg-elevated)',
                    position: 'relative',
                    transition: 'background 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: proctoringEnabled ? '29px' : '3px',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    transition: 'left 0.3s ease'
                  }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Problem Modal */}
      {showAddProblem && (
        <div className="modal-overlay" onClick={() => setShowAddProblem(false)}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>➕ Add New Problem</h2>

            {formError && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddProblem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="text" className="input-field" placeholder="Problem Title" value={problemForm.title} onChange={(e) => setProblemForm({...problemForm, title: e.target.value})} required />

              <textarea className="input-field" placeholder="Problem Description" rows={4} style={{ resize: 'vertical' }} value={problemForm.description} onChange={(e) => setProblemForm({...problemForm, description: e.target.value})} required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <select className="input-field" value={problemForm.language} onChange={(e) => setProblemForm({...problemForm, language: e.target.value})}>
                  <option value="c">C</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                </select>
                <select className="input-field" value={problemForm.difficulty} onChange={(e) => setProblemForm({...problemForm, difficulty: e.target.value})}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input type="number" className="input-field" placeholder="Base Points" min={50} value={problemForm.basePoints} onChange={(e) => setProblemForm({...problemForm, basePoints: parseInt(e.target.value)})} />
              </div>

              <textarea className="input-field font-mono" placeholder="Starter Code" rows={3} style={{ resize: 'vertical', fontSize: '0.85rem' }} value={problemForm.starterCode} onChange={(e) => setProblemForm({...problemForm, starterCode: e.target.value})} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="text" className="input-field" placeholder="Sample Input" value={problemForm.sampleInput} onChange={(e) => setProblemForm({...problemForm, sampleInput: e.target.value})} />
                <input type="text" className="input-field" placeholder="Sample Output" value={problemForm.sampleOutput} onChange={(e) => setProblemForm({...problemForm, sampleOutput: e.target.value})} />
              </div>

              {/* Test Cases */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Test Cases</label>
                  <button type="button" onClick={addTestCase} style={{
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--accent-primary)',
                    background: 'transparent', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600
                  }}>
                    + Add
                  </button>
                </div>
                {problemForm.testCases.map((tc, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input className="input-field" style={{ flex: 1, fontSize: '0.85rem' }} placeholder="Input" value={tc.input} onChange={(e) => updateTestCase(i, 'input', e.target.value)} />
                    <input className="input-field" style={{ flex: 1, fontSize: '0.85rem' }} placeholder="Expected Output" value={tc.expectedOutput} onChange={(e) => updateTestCase(i, 'expectedOutput', e.target.value)} />
                    {problemForm.testCases.length > 1 && (
                      <button type="button" onClick={() => removeTestCase(i)} style={{
                        padding: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--hard)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem'
                      }}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddProblem(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Problem</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Ad Modal */}
      {showAddAd && (
        <div className="modal-overlay" onClick={() => setShowAddAd(false)}>
          <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>📣 Add New Ad</h2>

            <form onSubmit={handleCreateAd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="text" className="input-field" placeholder="Sponsor (e.g. Dell)" value={adForm.sponsor} onChange={(e) => setAdForm({...adForm, sponsor: e.target.value})} required />
                <input type="text" className="input-field" placeholder="Ad Title" value={adForm.title} onChange={(e) => setAdForm({...adForm, title: e.target.value})} required />
              </div>
              <textarea className="input-field" placeholder="Description" rows={2} style={{ resize: 'vertical' }} value={adForm.description} onChange={(e) => setAdForm({...adForm, description: e.target.value})} />
              <input type="url" className="input-field" placeholder="Destination URL (https://…)" value={adForm.url} onChange={(e) => setAdForm({...adForm, url: e.target.value})} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <input type="text" className="input-field" placeholder="CTA (e.g. Shop Now)" value={adForm.cta} onChange={(e) => setAdForm({...adForm, cta: e.target.value})} />
                <input type="text" className="input-field" placeholder="Badge (e.g. ⭐ Hot)" value={adForm.badge} onChange={(e) => setAdForm({...adForm, badge: e.target.value})} />
                <select className="input-field" value={adForm.category} onChange={(e) => setAdForm({...adForm, category: e.target.value})}>
                  <option value="laptop">Laptop</option>
                  <option value="course">Course</option>
                  <option value="travel">Travel</option>
                  <option value="gadget">Gadget</option>
                  <option value="savings">Savings</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reward Points (0 = no reward)</label>
                  <input type="number" className="input-field" min="0" max="500" value={adForm.rewardPoints} onChange={(e) => setAdForm({...adForm, rewardPoints: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reward Cooldown (hours)</label>
                  <input type="number" className="input-field" min="0" max="168" value={adForm.rewardCooldownHours} onChange={(e) => setAdForm({...adForm, rewardCooldownHours: parseInt(e.target.value) || 24})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddAd(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Ad</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
