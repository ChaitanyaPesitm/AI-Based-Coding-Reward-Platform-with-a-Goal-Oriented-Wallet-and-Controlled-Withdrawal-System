'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { walletAPI, goalsAPI, submissionsAPI, authAPI } from '@/lib/api';
import GoalAd from '@/components/GoalAd';
import Link from 'next/link';

const BADGE_META = {
  first_solve:      { label: '🥇 First Solve',   color: '#fbbf24' },
  problems_10:      { label: '🔟 10 Problems',    color: '#60a5fa' },
  problems_25:      { label: '💪 25 Problems',    color: '#818cf8' },
  problems_50:      { label: '🏆 50 Problems',    color: '#f59e0b' },
  points_1000:      { label: '💎 1K Points',      color: '#a5f3fc' },
  points_5000:      { label: '🌟 5K Points',      color: '#c4b5fd' },
  points_10000:     { label: '👑 10K Points',     color: '#fde68a' },
  streak_7:         { label: '🔥 7-Day Streak',   color: '#fb923c' },
  streak_30:        { label: '⚡ 30-Day Streak',  color: '#facc15' },
  no_plagiarism_10: { label: '✨ Clean Coder',     color: '#86efac' }
};

export default function DashboardPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [recentSubs, setRecentSubs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', category: 'laptop', targetAmount: 5000 });
  const [goalError, setGoalError] = useState('');

  const fetchData = async () => {
    try {
      const [walletRes, goalsRes, subsRes, meRes] = await Promise.all([
        walletAPI.getOverview(),
        goalsAPI.getAll(),
        submissionsAPI.getAll({ limit: 5 }),
        authAPI.getMe()
      ]);
      setWallet(walletRes.data.data);
      setGoals(goalsRes.data.data);
      setRecentSubs(subsRes.data.data);
      setProfile(meRes.data.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
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

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setGoalError('');
    try {
      await goalsAPI.create(goalForm);
      setShowGoalModal(false);
      setGoalForm({ title: '', description: '', category: 'laptop', targetAmount: 5000 });
      fetchData();
    } catch (err) {
      setGoalError(err.response?.data?.message || 'Failed to create goal');
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
  const badges = profile?.badges || [];
  const currentStreak = profile?.currentStreak || 0;
  const longestStreak = profile?.longestStreak || 0;

  return (
    <div className="bg-grid" style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
      <div className="bg-glow-orb" style={{ top: '5%', right: '10%', background: 'var(--accent-primary)' }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 1 }}>

        {/* Welcome Header */}
        <div className="animate-fade-in-up" style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Welcome back, <span className="gradient-text">{user.name}</span> 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Track your progress and keep earning rewards
            </p>
          </div>
          {/* Streak Badge */}
          {currentStreak > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '10px',
              background: 'rgba(251, 146, 60, 0.1)',
              border: '1px solid rgba(251, 146, 60, 0.3)'
            }}>
              <span style={{ fontSize: '1.3rem' }}>🔥</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fb923c' }}>{currentStreak}-Day Streak</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Best: {longestStreak} days</div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="animate-fade-in-up delay-100" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          <div className="stat-card">
            <span className="stat-label">Total Points Earned</span>
            <span className="stat-value gradient-text">{wallet?.totalPoints?.toLocaleString() || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Wallet Balance (₹)</span>
            <span className="stat-value" style={{ color: 'var(--easy)' }}>₹{wallet?.currencyEquivalent?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Problems Solved</span>
            <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>{wallet?.problemsSolved || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Current Streak</span>
            <span className="stat-value" style={{ color: '#fb923c' }}>
              {currentStreak > 0 ? `🔥 ${currentStreak}` : '—'}
            </span>
          </div>
        </div>

        {/* Active Goal Section */}
        <div className="animate-fade-in-up delay-200" style={{ marginBottom: '28px' }}>
          {activeGoal ? (
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>🎯 {activeGoal.title}</h2>
                  <span className={`badge badge-${activeGoal.category === 'laptop' ? 'medium' : activeGoal.category === 'course' ? 'easy' : 'hard'}`} style={{ marginTop: '6px', display: 'inline-block' }}>
                    {activeGoal.category}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }} className="gradient-text">
                    {activeGoal.progressPercentage}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {activeGoal.currentPoints?.toLocaleString()} / {activeGoal.targetAmount?.toLocaleString()} pts
                  </div>
                </div>
              </div>

              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${activeGoal.progressPercentage}%` }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>₹{activeGoal.currencyEquivalent?.toFixed(2)} earned</span>
                <span>₹{activeGoal.targetCurrency?.toFixed(2)} target</span>
              </div>

              {activeGoal.canWithdraw && (
                <Link href="/wallet">
                  <button className="btn-primary" style={{ marginTop: '16px', width: '100%' }}>
                    🎉 Goal Complete! Withdraw Now →
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <span style={{ fontSize: '3rem' }}>🎯</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '12px' }}>No Active Goal</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '6px', marginBottom: '20px' }}>
                Set a financial goal to start tracking your reward progress
              </p>
              <button className="btn-primary" onClick={() => setShowGoalModal(true)}>
                Set Your Goal →
              </button>
            </div>
          )}
        </div>

        {/* Goal-based Ad */}
        {activeGoal && (
          <div className="animate-fade-in-up delay-300" style={{ marginBottom: '28px' }}>
            <GoalAd category={activeGoal.category} />
          </div>
        )}

        {/* Badges Section */}
        {badges.length > 0 && (
          <div className="animate-fade-in-up delay-300" style={{ marginBottom: '28px' }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>🎖️ Your Badges</h3>
                <Link href="/leaderboard?tab=badges" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                  View all →
                </Link>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {badges.map(b => {
                  const meta = BADGE_META[b];
                  if (!meta) return null;
                  return (
                    <div key={b} title={meta.label} style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: meta.color + '18',
                      border: `1px solid ${meta.color}40`,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: meta.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {meta.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions + Recent Submissions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Quick Actions */}
          <div className="glass-card animate-fade-in-up delay-400" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>⚡ Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/problems" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                  <span style={{ fontSize: '1.2rem' }}>💻</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Solve Problems</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Practice C, Python, or Java</div>
                  </div>
                </div>
              </Link>
              <Link href="/leaderboard" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.2rem' }}>🏆</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Leaderboard</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>See top coders & badges</div>
                  </div>
                </div>
              </Link>
              <Link href="/wallet" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.2rem' }}>💰</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>View Wallet</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Check balance & history</div>
                  </div>
                </div>
              </Link>
              {!activeGoal && (
                <div onClick={() => setShowGoalModal(true)} style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.2rem' }}>🎯</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Set a Goal</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Create your financial target</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="glass-card animate-fade-in-up delay-500" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>📝 Recent Submissions</h3>
            {recentSubs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentSubs.map(sub => (
                  <div key={sub._id} style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sub.problem?.title || 'Problem'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span className={`badge-lang badge-${sub.language}`}>{sub.language}</span>
                        {' '}• {sub.testCasesPassed}/{sub.totalTestCases} passed
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: sub.status === 'accepted' ? 'var(--easy)' : sub.pointsEarned > 0 ? 'var(--medium)' : 'var(--hard)' }}>
                        {sub.status === 'accepted' ? '✅' : sub.pointsEarned > 0 ? '⚠️' : '❌'} +{sub.pointsEarned}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.9rem' }}>No submissions yet</p>
                <Link href="/problems">
                  <button className="btn-primary" style={{ marginTop: '12px', padding: '8px 20px', fontSize: '0.85rem' }}>
                    Start Solving →
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goal Creation Modal */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '6px' }}>🎯 Set Your Financial Goal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Choose what you want to save for. You&apos;ll earn points by solving coding problems!
            </p>

            {goalError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
                {goalError}
              </div>
            )}

            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Goal Title</label>
                <input type="text" className="input-field" placeholder="e.g., Buy a Laptop" value={goalForm.title} onChange={(e) => setGoalForm({...goalForm, title: e.target.value})} required />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Category</label>
                <select className="input-field" value={goalForm.category} onChange={(e) => setGoalForm({...goalForm, category: e.target.value})}>
                  <option value="laptop">💻 Laptop / PC</option>
                  <option value="course">📚 Course / Certification</option>
                  <option value="travel">✈️ Travel</option>
                  <option value="gadget">📱 Gadget</option>
                  <option value="savings">🏦 Savings</option>
                  <option value="custom">🎯 Custom</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Target Points (100 pts = ₹10)</label>
                <input type="number" className="input-field" placeholder="e.g., 50000" min="100" value={goalForm.targetAmount} onChange={(e) => setGoalForm({...goalForm, targetAmount: parseInt(e.target.value) || 0})} required />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>≈ ₹{((goalForm.targetAmount || 0) / 100 * 10).toLocaleString()}</p>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Description (optional)</label>
                <input type="text" className="input-field" placeholder="Why this goal matters to you" value={goalForm.description} onChange={(e) => setGoalForm({...goalForm, description: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowGoalModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Goal 🎯</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
