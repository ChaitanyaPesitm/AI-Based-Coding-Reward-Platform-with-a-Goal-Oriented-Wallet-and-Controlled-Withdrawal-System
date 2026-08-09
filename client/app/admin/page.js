'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { problemsAPI, withdrawalsAPI, settingsAPI } from '@/lib/api';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('problems');
  const [problems, setProblems] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
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
      const [probRes, wdRes, settingsRes] = await Promise.all([
        problemsAPI.getAll(),
        withdrawalsAPI.getAllAdmin({}).catch(() => ({ data: { data: [] } })),
        settingsAPI.get().catch(() => ({ data: { data: { proctoringEnabled: true } } }))
      ]);
      setProblems(probRes.data.data);
      setWithdrawals(wdRes.data.data);
      setProctoringEnabled(settingsRes.data.data?.proctoringEnabled !== false);
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
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {['problems', 'withdrawals', 'settings'].map(t => (
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
              {t === 'problems' ? '💻 ' : t === 'settings' ? '⚙️ ' : '📋 '}{t}
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
    </div>
  );
}
