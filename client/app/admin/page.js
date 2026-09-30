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
      fetchData();
    }
  }, [user]);

  const handleAddProblem = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const validTestCases = problemForm.testCases.filter(tc => tc.input && tc.expectedOutput);
      if (validTestCases.length === 0) {
        setFormError('At least one test case with input and output is required');
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading administrator controls...</span>
      </div>
    );
  }

  if (!user?.isAdmin) return null;

  const pendingWdCount = withdrawals.filter(w => w.status === 'pending' || w.status === 'verified').length;
  const openFraudCount = fraudCases.filter(f => f.status === 'open' || f.status === 'flagged').length;

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Header */}
        <div style={{
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '16px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Administrative Governance • System Controls
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
            Administrator Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
            Audit challenge catalogs, approve financial withdrawals, inspect proctoring violators, and monitor anti-fraud telemetry.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '22px', flexWrap: 'wrap' }}>
          {[
            { id: 'problems', label: 'Challenges', badge: null },
            { id: 'withdrawals', label: 'Withdrawal Approvals', badge: pendingWdCount > 0 ? pendingWdCount : null },
            { id: 'analytics', label: 'Telemetry & Audit', badge: null },
            { id: 'fraud', label: 'Anti-Fraud Engine', badge: openFraudCount > 0 ? openFraudCount : null },
            { id: 'ads', label: 'Sponsored Notices', badge: null },
            { id: 'violators', label: 'Proctoring Violators', badge: violators.length > 0 ? violators.length : null },
            { id: 'settings', label: 'Platform Controls', badge: null }
          ].map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={active ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                <span>{t.label}</span>
                {t.badge && (
                  <span style={{
                    marginLeft: '6px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: active ? '#ffffff' : 'var(--danger)',
                    color: active ? 'var(--primary)' : '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 700
                  }}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Problems Management */}
        {tab === 'problems' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {problems.length} challenge specifications deployed
              </span>
              <button className="btn-primary" onClick={() => setShowAddProblem(true)} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                + Deploy New Challenge
              </button>
            </div>

            <div className="panel-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Challenge Title</th>
                      <th>Runtime</th>
                      <th>Difficulty</th>
                      <th>Base Credits</th>
                      <th>Test Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.map(p => (
                      <tr key={p._id}>
                        <td style={{ fontWeight: 600 }}>{p.title}</td>
                        <td><span className={`badge-lang badge-${p.language}`}>{p.language}</span></td>
                        <td><span className={`badge badge-${p.difficulty}`}>{p.difficulty}</span></td>
                        <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{p.basePoints} pts</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{p.testCases?.length || 0} configured</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Withdrawals Approval Queue */}
        {tab === 'withdrawals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                Disbursement Authorization Queue ({withdrawals.length})
              </h3>
            </div>

            {withdrawals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {withdrawals.map(w => {
                  const isPending = w.status === 'pending' || w.status === 'verified';
                  return (
                    <div key={w._id} className="panel-card" style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {w.user?.name || 'Student Candidate'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              ({w.user?.email})
                            </span>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Milestone Target: <strong>{w.goal?.title || 'Milestone'}</strong> ({w.goal?.category})
                          </div>

                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                            Disbursement: <strong style={{ color: 'var(--easy)' }}>₹{w.currencyAmount?.toFixed(2)}</strong> ({w.pointsAmount?.toLocaleString()} pts)
                          </div>

                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Anti-Fraud Score: <span style={{ color: w.fraudScore > 30 ? 'var(--hard)' : 'var(--easy)', fontWeight: 600 }}>{w.fraudScore}/100</span>
                            {w.fraudDetails?.suspiciousPatterns && ` • Diagnostic: ${w.fraudDetails.suspiciousPatterns}`}
                          </div>

                          {w.upiId && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Beneficiary VPA: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{w.upiId}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <span className="badge" style={{
                            background: w.status === 'approved' || w.status === 'completed' ? 'var(--success-subtle)' :
                                        w.status === 'rejected' ? 'var(--danger-subtle)' :
                                        'var(--warning-subtle)',
                            color: w.status === 'approved' || w.status === 'completed' ? 'var(--easy)' :
                                   w.status === 'rejected' ? 'var(--hard)' :
                                   'var(--warning)',
                            border: `1px solid ${w.status === 'approved' || w.status === 'completed' ? 'var(--success-border)' : w.status === 'rejected' ? 'var(--danger-border)' : 'var(--warning-border)'}`,
                            textTransform: 'uppercase'
                          }}>
                            {w.status}
                          </span>

                          {isPending && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn-success"
                                onClick={() => handleApprove(w._id)}
                                style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                              >
                                ✓ Authorize
                              </button>
                              <button
                                className="btn-danger"
                                onClick={() => handleReject(w._id)}
                                style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                              >
                                ✕ Deny
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="panel-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No disbursement requests in the queue.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Analytics & Ledger Audit */}
        {tab === 'analytics' && (
          <div>
            {analytics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* 6 Key Stat Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div className="stat-card" style={{ padding: '14px 16px' }}>
                    <span className="stat-label">Active Users</span>
                    <span className="stat-value">{analytics.users?.total}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{analytics.users?.newToday} today</span>
                  </div>

                  <div className="stat-card" style={{ padding: '14px 16px' }}>
                    <span className="stat-label">Total Submissions</span>
                    <span className="stat-value">{analytics.submissions?.total}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{analytics.submissions?.today} today</span>
                  </div>

                  <div className="stat-card" style={{ padding: '14px 16px' }}>
                    <span className="stat-label">Acceptance Rate</span>
                    <span className="stat-value" style={{ color: 'var(--easy)' }}>{analytics.submissions?.acceptanceRate}%</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{analytics.submissions?.accepted} accepted</span>
                  </div>

                  <div className="stat-card" style={{ padding: '14px 16px' }}>
                    <span className="stat-label">Points Distributed</span>
                    <span className="stat-value" style={{ color: 'var(--primary)' }}>{analytics.points?.distributed?.toLocaleString()}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{analytics.points?.last7dEarned?.toLocaleString()} past 7d</span>
                  </div>

                  <div className="stat-card" style={{ padding: '14px 16px' }}>
                    <span className="stat-label">Points Withdrawn</span>
                    <span className="stat-value" style={{ color: 'var(--warning)' }}>{analytics.points?.withdrawn?.toLocaleString()}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{analytics.withdrawals?.pending} pending review</span>
                  </div>

                  <div className="stat-card" style={{ padding: '14px 16px' }}>
                    <span className="stat-label">AI Fallbacks</span>
                    <span className="stat-value" style={{ color: analytics.submissions?.aiFailures > 0 ? 'var(--hard)' : 'var(--easy)' }}>
                      {analytics.submissions?.aiFailures}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>auto-fallback scored</span>
                  </div>
                </div>

                {/* Activity 14d histogram */}
                {analytics.series?.submissions?.length > 0 && (
                  <div className="panel-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '12px' }}>
                      Submission Activity Trajectory (14-Day Window)
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', overflowX: 'auto', border: '1px solid var(--border-subtle)' }}>
                      {analytics.series.submissions.map((d, i) => {
                        const max = Math.max(1, ...analytics.series.submissions.map(x => x.count));
                        return (
                          <div key={d.date} title={`${d.date}: ${d.count} submissions`} style={{ flex: '1 0 auto', minWidth: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', alignItems: 'center', gap: '2px' }}>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{d.count}</div>
                            <div style={{
                              width: '100%',
                              borderRadius: '2px 2px 0 0',
                              height: `${Math.max(4, (d.count / max) * 100)}%`,
                              background: 'var(--primary)'
                            }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Most Solved & Most Difficult */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                  <div className="panel-card" style={{ padding: '18px' }}>
                    <h3 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '12px' }}>
                      Highest Frequency Solves
                    </h3>
                    {analytics.mostSolved?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {analytics.mostSolved.map(p => (
                          <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span style={{ fontWeight: 600 }}>{p.title}</span>
                            <span style={{ color: 'var(--easy)', fontWeight: 600 }}>{p.accepted} solved</span>
                          </div>
                        ))}
                      </div>
                    ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No solves logged yet</p>}
                  </div>

                  <div className="panel-card" style={{ padding: '18px' }}>
                    <h3 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '12px' }}>
                      Highest Failure Rates
                    </h3>
                    {analytics.mostDifficult?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {analytics.mostDifficult.map(p => (
                          <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span style={{ fontWeight: 600 }}>{p.title}</span>
                            <span>
                              <span style={{ color: 'var(--hard)', fontWeight: 700 }}>{Math.round(p.acceptRate)}% pass</span>
                              <span style={{ color: 'var(--text-muted)' }}> ({p.accepted}/{p.attempts})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Insufficient data</p>}
                  </div>
                </div>

                {/* Ledger Audit Table */}
                <div className="panel-card" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '14px' }}>
                    Immutable Transaction Ledger Audit
                  </h3>
                  <LedgerTable />
                </div>
              </div>
            ) : (
              <div className="panel-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Analytics service currently unavailable.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Anti-Fraud Engine */}
        {tab === 'fraud' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                  Anti-Cheating Diagnostics
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  Suspicious Account Detections ({fraudCases.length})
                </h3>
              </div>
              <button className="btn-secondary" onClick={handleFraudScan} style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                Trigger Full Platform Audit Scan
              </button>
            </div>

            {fraudCases.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fraudCases.map(c => (
                  <div key={c._id} className="panel-card" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.user?.name || 'Student User'}</span>
                          <span className="badge" style={{
                            background: c.level === 'clean' ? 'var(--success-subtle)' : c.level === 'attention' ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                            color: c.level === 'clean' ? 'var(--easy)' : c.level === 'attention' ? 'var(--warning)' : 'var(--hard)',
                            border: `1px solid ${c.level === 'clean' ? 'var(--success-border)' : c.level === 'attention' ? 'var(--warning-border)' : 'var(--danger-border)'}`,
                            textTransform: 'capitalize'
                          }}>
                            {c.level}
                          </span>
                          <span className="badge" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', textTransform: 'capitalize' }}>
                            Status: {c.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {c.user?.email} • {c.user?.problemsSolved} solves • {c.user?.totalPointsEarned} credits
                        </div>

                        {c.reasons?.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {c.reasons.filter(r => r.points > 0).map((r, i) => (
                              <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '4px', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                <span>{r.detail}</span>
                                <span style={{ fontWeight: 700, color: 'var(--hard)' }}>+{r.points}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {c.adminNotes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                            Audit Record: {c.adminNotes}
                          </div>
                        )}
                      </div>

                      {/* Score Dial */}
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        border: `3px solid ${c.score >= 50 ? 'var(--hard)' : c.score >= 25 ? 'var(--warning)' : 'var(--easy)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: 'var(--text-primary)'
                      }}>
                        {c.score}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleFraudReview(c._id, 'cleared', 'Cleared by administrator')}>
                        ✓ Clear Record
                      </button>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleFraudReview(c._id, 'reviewed', 'Reviewed by admin')}>
                        Mark Reviewed
                      </button>
                      <button className="btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleFraudReview(c._id, 'flagged', 'Flagged by admin')}>
                        Flag Confirmed Abuse
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No fraudulent anomalies flagged across student accounts.
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Sponsored Notices */}
        {tab === 'ads' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Goal-targeted academic & industry notices ({ads.length})
              </span>
              <button className="btn-primary" onClick={() => setShowAddAd(true)} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                + Add Sponsored Notice
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ads.length > 0 ? ads.map(ad => (
                <div key={ad._id} className="panel-card" style={{ padding: '16px 18px', opacity: ad.isActive ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{ad.title}</span>
                        <span className="badge" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', textTransform: 'capitalize' }}>
                          {ad.category}
                        </span>
                        {ad.rewardPoints > 0 && (
                          <span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--easy)' }}>
                            +{ad.rewardPoints} bonus pts
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Partner: {ad.sponsor} • Destination: {ad.url}
                      </div>

                      {ad.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {ad.description}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>Impressions: {ad.impressions}</span>
                        <span>Clicks: {ad.clicks}</span>
                        <span>CTR: {ad.ctr}%</span>
                        <span>Rewarded Views: {ad.rewardClaims}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                        onClick={() => handleToggleAd(ad)}
                      >
                        {ad.isActive ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                        onClick={() => handleDeleteAd(ad._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="panel-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No sponsored notices configured.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Proctoring Violators */}
        {tab === 'violators' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                Flagged Proctoring Incidents ({violators.length})
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Authoritative server-side violation telemetry recorded during problem assessment sessions.
              </p>
            </div>

            {violators.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {violators.map(v => (
                  <div key={v.userId} className="panel-card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{v.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v.email}</div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                          <span className="badge badge-hard">
                            {v.flaggedCount} flagged submission{v.flaggedCount !== 1 ? 's' : ''}
                          </span>
                          <span className="badge badge-medium">
                            {v.totalViolations} recorded violation{v.totalViolations !== 1 ? 's' : ''}
                          </span>
                          <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                            Last: {new Date(v.lastFlaggedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {v.problems && v.problems.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {v.problems.map((p, i) => (
                              <span key={i} style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                                {p.title} ({p.language})
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
              <div className="panel-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No proctoring violations recorded in active sessions.
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Platform Settings */}
        {tab === 'settings' && (
          <div>
            <div className="panel-card" style={{ padding: '22px', maxWidth: '640px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    Anti-Cheat Proctoring Engine
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.55 }}>
                    When enabled, problem submissions require an active proctoring session that monitors tab switches,
                    window blur events, unauthorized clipboard pasting, and shortcuts. Violations are journaled server-side.
                  </div>
                  <div style={{ fontSize: '0.78rem', marginTop: '8px', fontWeight: 600, color: proctoringEnabled ? 'var(--easy)' : 'var(--hard)' }}>
                    {proctoringEnabled ? '● Proctoring enforcement is currently ACTIVE' : '○ Proctoring enforcement is DISABLED'}
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={proctoringEnabled}
                  aria-label="Toggle proctoring mode"
                  onClick={handleToggleProctoring}
                  style={{
                    width: '52px',
                    height: '28px',
                    flexShrink: 0,
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    background: proctoringEnabled ? 'var(--easy)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    position: 'relative',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: proctoringEnabled ? '26px' : '2px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    transition: 'left 0.2s ease'
                  }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deploy Challenge Modal */}
      {showAddProblem && (
        <div className="modal-overlay" onClick={() => setShowAddProblem(false)}>
          <div className="modal-content" style={{ maxWidth: '580px', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                Curriculum Authoring
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                Deploy New Problem Challenge
              </h2>
            </div>

            {formError && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '12px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddProblem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" className="input-field" placeholder="Challenge Title" value={problemForm.title} onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })} required />

              <textarea className="input-field" placeholder="Problem Description and Requirements" rows={3} style={{ resize: 'vertical' }} value={problemForm.description} onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })} required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <select className="input-field" value={problemForm.language} onChange={(e) => setProblemForm({ ...problemForm, language: e.target.value })}>
                  <option value="c">C</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                </select>
                <select className="input-field" value={problemForm.difficulty} onChange={(e) => setProblemForm({ ...problemForm, difficulty: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input type="number" className="input-field" placeholder="Base Points" min={50} value={problemForm.basePoints} onChange={(e) => setProblemForm({ ...problemForm, basePoints: parseInt(e.target.value) || 0 })} />
              </div>

              <textarea className="input-field font-mono" placeholder="Starter Code Template" rows={3} style={{ resize: 'vertical', fontSize: '0.8rem' }} value={problemForm.starterCode} onChange={(e) => setProblemForm({ ...problemForm, starterCode: e.target.value })} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="text" className="input-field" placeholder="Sample Input" value={problemForm.sampleInput} onChange={(e) => setProblemForm({ ...problemForm, sampleInput: e.target.value })} />
                <input type="text" className="input-field" placeholder="Sample Output" value={problemForm.sampleOutput} onChange={(e) => setProblemForm({ ...problemForm, sampleOutput: e.target.value })} />
              </div>

              {/* Test Cases */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Evaluation Test Cases ({problemForm.testCases.length})
                  </label>
                  <button type="button" onClick={addTestCase} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                    + Add Vector
                  </button>
                </div>
                {problemForm.testCases.map((tc, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input className="input-field" style={{ flex: 1, fontSize: '0.8rem' }} placeholder="Standard Input" value={tc.input} onChange={(e) => updateTestCase(i, 'input', e.target.value)} />
                    <input className="input-field" style={{ flex: 1, fontSize: '0.8rem' }} placeholder="Expected Output" value={tc.expectedOutput} onChange={(e) => updateTestCase(i, 'expectedOutput', e.target.value)} />
                    {problemForm.testCases.length > 1 && (
                      <button type="button" onClick={() => removeTestCase(i)} style={{
                        padding: '6px 10px', border: '1px solid var(--danger-border)', background: 'var(--danger-subtle)',
                        color: 'var(--danger)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                      }}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddProblem(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Deploy Problem</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sponsored Notice Modal */}
      {showAddAd && (
        <div className="modal-overlay" onClick={() => setShowAddAd(false)}>
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                Notice Management
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                Create Sponsored Academic Notice
              </h2>
            </div>

            <form onSubmit={handleCreateAd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="text" className="input-field" placeholder="Sponsor Entity (e.g. Dell)" value={adForm.sponsor} onChange={(e) => setAdForm({ ...adForm, sponsor: e.target.value })} required />
                <input type="text" className="input-field" placeholder="Notice Title" value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} required />
              </div>
              <textarea className="input-field" placeholder="Notice Description" rows={2} style={{ resize: 'vertical' }} value={adForm.description} onChange={(e) => setAdForm({ ...adForm, description: e.target.value })} />
              <input type="url" className="input-field" placeholder="Destination URL (https://…)" value={adForm.url} onChange={(e) => setAdForm({ ...adForm, url: e.target.value })} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <input type="text" className="input-field" placeholder="Action Label (e.g. Apply)" value={adForm.cta} onChange={(e) => setAdForm({ ...adForm, cta: e.target.value })} />
                <input type="text" className="input-field" placeholder="Tag (e.g. Student)" value={adForm.badge} onChange={(e) => setAdForm({ ...adForm, badge: e.target.value })} />
                <select className="input-field" value={adForm.category} onChange={(e) => setAdForm({ ...adForm, category: e.target.value })}>
                  <option value="laptop">Laptop</option>
                  <option value="course">Course</option>
                  <option value="travel">Travel</option>
                  <option value="gadget">Gadget</option>
                  <option value="savings">Savings</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Bonus Points (0-500)</label>
                  <input type="number" className="input-field" min="0" max="500" value={adForm.rewardPoints} onChange={(e) => setAdForm({ ...adForm, rewardPoints: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Cooldown Period (hours)</label>
                  <input type="number" className="input-field" min="0" max="168" value={adForm.rewardCooldownHours} onChange={(e) => setAdForm({ ...adForm, rewardCooldownHours: parseInt(e.target.value) || 24 })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddAd(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Notice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
