'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { walletAPI, goalsAPI, submissionsAPI, authAPI, recommendationsAPI, fraudAPI } from '@/lib/api';
import GoalAd from '@/components/GoalAd';
import CompletionChart from '@/components/CompletionChart';
import Link from 'next/link';

const BADGE_META = {
  first_solve:      { label: 'First Solve',       color: '#059669', bg: 'var(--success-subtle)' },
  problems_10:      { label: '10 Problems Solved', color: '#0284c7', bg: 'var(--info-subtle)' },
  problems_25:      { label: '25 Problems Solved', color: '#2563eb', bg: 'var(--primary-subtle)' },
  problems_50:      { label: '50 Problems Solved', color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.1)' },
  points_1000:      { label: '1,000 Points',      color: '#0284c7', bg: 'var(--info-subtle)' },
  points_5000:      { label: '5,000 Points',      color: '#2563eb', bg: 'var(--primary-subtle)' },
  points_10000:     { label: '10,000 Points',     color: '#d97706', bg: 'var(--warning-subtle)' },
  streak_7:         { label: '7-Day Streak',      color: '#d97706', bg: 'var(--warning-subtle)' },
  streak_30:        { label: '30-Day Streak',     color: '#b45309', bg: 'rgba(180, 83, 9, 0.1)' },
  no_plagiarism_10: { label: 'Clean Coder',       color: '#059669', bg: 'var(--success-subtle)' }
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [recentSubs, setRecentSubs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [fraudScore, setFraudScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', category: 'laptop', targetAmount: 10000 });
  const [goalError, setGoalError] = useState('');

  const fetchData = async () => {
    try {
      const [walletRes, goalsRes, subsRes, meRes, recRes, anaRes, fraudRes] = await Promise.all([
        walletAPI.getOverview().catch(() => ({ data: { data: null } })),
        goalsAPI.getAll().catch(() => ({ data: { data: [] } })),
        submissionsAPI.getAll({ limit: 50 }).catch(() => ({ data: { data: [] } })),
        authAPI.getMe().catch(() => ({ data: { data: null } })),
        recommendationsAPI.get().catch(() => ({ data: { data: null } })),
        submissionsAPI.getAnalytics().catch(() => ({ data: { data: null } })),
        fraudAPI.getMyScore().catch(() => ({ data: { data: null } }))
      ]);
      setWallet(walletRes.data.data);
      setGoals(goalsRes.data.data);
      setRecentSubs(subsRes.data.data);
      setProfile(meRes.data.data);
      setRecommendations(recRes.data.data);
      setAnalytics(anaRes.data.data);
      setFraudScore(fraudRes.data.data);
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
      fetchData();
    }
  }, [user]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setGoalError('');
    try {
      await goalsAPI.create(goalForm);
      setShowGoalModal(false);
      setGoalForm({ title: '', description: '', category: 'laptop', targetAmount: 10000 });
      fetchData();
    } catch (err) {
      setGoalError(err.response?.data?.message || 'Failed to create goal');
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading student telemetry...</span>
      </div>
    );
  }

  if (!user) return null;

  const activeGoal = wallet?.activeGoal;
  const badges = profile?.badges || [];
  const currentStreak = profile?.currentStreak || 0;
  const longestStreak = profile?.longestStreak || 0;

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Section Header */}
        <div style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '16px'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Student Portal • Overview
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              Welcome, {user.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
              PESITM Academic ID • Session Active
            </p>
          </div>

          {/* Streak Chip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-medium)'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: currentStreak > 0 ? 'var(--warning)' : 'var(--text-muted)'
            }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {currentStreak > 0 ? `${currentStreak}-Day Active Streak` : 'No Active Streak'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Personal Best: {longestStreak} days
              </div>
            </div>
          </div>
        </div>

        {/* Top 4 Key Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '24px'
        }}>
          <div className="stat-card">
            <span className="stat-label">Accumulated Points</span>
            <span className="stat-value" style={{ color: 'var(--primary)' }}>
              {wallet?.totalPoints?.toLocaleString() || 0}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Wallet Balance</span>
            <span className="stat-value" style={{ color: 'var(--easy)' }}>
              ₹{wallet?.currencyEquivalent?.toFixed(2) || '0.00'}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Problems Solved</span>
            <span className="stat-value" style={{ color: 'var(--text-primary)' }}>
              {wallet?.problemsSolved || 0}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Active Streak</span>
            <span className="stat-value" style={{ color: currentStreak > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
              {currentStreak} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>days</span>
            </span>
          </div>
        </div>

        {/* 7-Day Coding Problem Completion History (Recharts Bar Chart) */}
        <CompletionChart rawData={analytics?.last7Days} submissions={recentSubs} />

        {/* Active Financial Goal Card */}
        <div style={{ marginBottom: '24px' }}>
          {activeGoal ? (
            <div className="panel-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                      Active Financial Target
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
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: activeGoal.canWithdraw ? 'var(--easy)' : 'var(--primary)' }}>
                    {activeGoal.progressPercentage}% Complete
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {activeGoal.currentPoints?.toLocaleString()} / {activeGoal.targetAmount?.toLocaleString()} points
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-bar-bg" style={{ height: '10px' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(100, activeGoal.progressPercentage)}%`,
                    background: activeGoal.canWithdraw ? 'var(--easy)' : 'var(--primary)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Earned: <strong>₹{activeGoal.currencyEquivalent?.toFixed(2)}</strong></span>
                <span>Target: <strong>₹{activeGoal.targetCurrency?.toFixed(2)}</strong></span>
              </div>

              {activeGoal.canWithdraw && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'var(--success-subtle)',
                  border: '1px solid var(--success-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--easy)' }}>
                      Goal Target Achieved (100%)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Controlled withdrawal eligibility verified. Ready for payout request.
                    </div>
                  </div>
                  <Link href="/wallet" style={{ textDecoration: 'none' }}>
                    <button className="btn-success" style={{ padding: '7px 18px', fontSize: '0.8rem' }}>
                      Request Payout in Wallet →
                    </button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="panel-card" style={{ padding: '32px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                No Active Financial Goal
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', marginBottom: '18px' }}>
                Define a verified target (laptop, course, or certification) to activate reward accumulation.
              </p>
              <button className="btn-primary" onClick={() => setShowGoalModal(true)}>
                Define Goal Target
              </button>
            </div>
          )}
        </div>

        {/* Phase 2: Gamification - Daily Quest Card */}
        {profile?.dailyQuest && (
          <div className="panel-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                  Daily Gamification
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  Today's Quest: {profile.dailyQuest.description}
                </h3>
              </div>
              {profile.dailyQuest.completed ? (
                <span className="badge badge-easy" style={{ fontSize: '0.85rem' }}>✓ Completed (+{profile.dailyQuest.rewardPoints} pts)</span>
              ) : (
                <span className="badge badge-medium" style={{ fontSize: '0.85rem' }}>
                  Reward: +{profile.dailyQuest.rewardPoints} pts
                </span>
              )}
            </div>

            {!profile.dailyQuest.completed && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Progress</span>
                  <span>{profile.dailyQuest.progress} / {profile.dailyQuest.target}</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '8px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, (profile.dailyQuest.progress / profile.dailyQuest.target) * 100)}%`,
                      background: 'var(--primary)'
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Goal-Targeted Sponsored Ad */}
        {activeGoal && (
          <div style={{ marginBottom: '24px' }}>
            <GoalAd category={activeGoal.category} />
          </div>
        )}

        {/* Badges Earned */}
        {badges.length > 0 && (
          <div className="panel-card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                Verified Achievements & Badges ({badges.length})
              </div>
              <Link href="/leaderboard?tab=badges" style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                View All Badges →
              </Link>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {badges.map(b => {
                const meta = BADGE_META[b] || { label: b, color: 'var(--text-primary)', bg: 'var(--bg-secondary)' };
                return (
                  <div key={b} style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: meta.bg,
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: meta.color
                  }}>
                    {meta.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2-Column: Quick Actions + Recent Submissions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* Quick Actions */}
          <div className="panel-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '14px' }}>
              Workspace Navigation
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/problems" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'border-color 0.15s ease'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Coding Challenges</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>C, Python, and Java execution catalog</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
                </div>
              </Link>

              <Link href="/leaderboard" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Rankings & Leaderboard</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class standings and peer benchmarks</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
                </div>
              </Link>

              <Link href="/wallet" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Financial Wallet</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Balance, certificate PDF, and withdrawal</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
                </div>
              </Link>

              {!activeGoal && (
                <div
                  onClick={() => setShowGoalModal(true)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'var(--primary-subtle)',
                    border: '1px solid var(--border-medium)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>+ Define Goal Target</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Set a minimum 10,000-point saving objective</div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="panel-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                Recent Submissions
              </h3>
              <Link href="/problems" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}>
                Practice More →
              </Link>
            </div>

            {recentSubs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentSubs.map(sub => {
                  const isAccepted = sub.status === 'accepted';
                  return (
                    <div key={sub._id} style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {sub.problem?.title || 'Coding Problem'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`badge-lang badge-${sub.language}`}>{sub.language}</span>
                          <span>•</span>
                          <span>{sub.testCasesPassed}/{sub.totalTestCases} passed</span>
                          {sub.executionTime > 0 && (
                            <>
                              <span>•</span>
                              <span>{sub.executionTime}ms</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: isAccepted ? 'var(--easy)' : sub.pointsEarned > 0 ? 'var(--medium)' : 'var(--hard)'
                        }}>
                          +{sub.pointsEarned} pts
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {sub.status.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <p>No recent submissions recorded.</p>
                <Link href="/problems" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ marginTop: '10px', padding: '7px 16px', fontSize: '0.8rem' }}>
                    Open Problem Directory
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendations Panel */}
        {recommendations && recommendations.recommendations && recommendations.recommendations.length > 0 && (
          <div className="panel-card" style={{ padding: '22px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                  Gemini AI Guidance
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  Adaptive Learning Path
                </h3>
              </div>
              <span className="badge" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
                Target: {recommendations.difficultyRecommendation?.difficulty}
              </span>
            </div>

            {recommendations.difficultyRecommendation?.rationale && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                marginBottom: '14px'
              }}>
                <strong>Adaptive Diagnostic:</strong> {recommendations.difficultyRecommendation?.rationale}
              </div>
            )}

            {/* Weak Areas */}
            {recommendations.weakAreas && recommendations.weakAreas.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Topics Requiring Practice
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {recommendations.weakAreas.map(w => (
                    <span key={w.category} className="badge badge-hard">
                      {w.category} • avg AI {w.avgAiScore}/100
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Problems */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recommendations.recommendations.slice(0, 3).map(r => (
                <Link key={r.problem._id} href={`/problems/${r.problem._id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{r.problem.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{r.reason}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge badge-${r.problem.difficulty}`}>{r.problem.difficulty}</span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{r.problem.basePoints} pts</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Analytics & Account Trust Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Analytics Summary */}
          {analytics && (
            <div className="panel-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '14px' }}>
                Algorithmic Performance
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acceptance Rate</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{analytics.totals.acceptRate}%</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average AI Score</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{analytics.totals.avgAiScore}/100</div>
                </div>
              </div>

              {analytics.series && analytics.series.length > 1 && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Historical Score Trajectory (Last {Math.min(analytics.series.length, 30)} Submissions)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px', padding: '6px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    {analytics.series.slice(-30).map((p, i) => (
                      <div key={i} style={{ flex: '1 0 auto', minWidth: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                        <div style={{
                          width: '100%',
                          borderRadius: '2px',
                          height: `${Math.max(4, p.aiScore)}%`,
                          background: p.aiScore >= 70 ? 'var(--easy)' : p.aiScore >= 40 ? 'var(--medium)' : 'var(--hard)'
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account Trust / Fraud Assessment */}
          {fraudScore && (
            <div className="panel-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '14px' }}>
                Account Trust Assessment
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: `3px solid ${fraudScore.score >= 50 ? 'var(--hard)' : fraudScore.score >= 25 ? 'var(--medium)' : 'var(--easy)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'var(--text-primary)'
                }}>
                  {fraudScore.score}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Status: <span style={{ textTransform: 'capitalize', color: fraudScore.level === 'clean' ? 'var(--easy)' : 'var(--hard)' }}>{fraudScore.level}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Calculated from {fraudScore.reasons?.length || 0} signal checks (0 = pristine).
                  </div>
                </div>
              </div>

              {fraudScore.reasons && fraudScore.reasons.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fraudScore.reasons.map((r, i) => (
                    <div key={i} style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{r.detail}</span>
                      {r.points > 0 && (
                        <span style={{ fontWeight: 700, color: 'var(--hard)' }}>+{r.points}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Set Goal Modal Dialog */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                Goal Planning
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                Define Financial Objective
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                Configure your target item and minimum point threshold (100 points = ₹10).
              </p>
            </div>

            {goalError && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '14px' }}>
                {goalError}
              </div>
            )}

            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Goal Title
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Dell XPS Development Laptop"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Target Category
                </label>
                <select
                  className="input-field"
                  value={goalForm.category}
                  onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                >
                  <option value="laptop">Laptop / Hardware</option>
                  <option value="course">Course / Certification</option>
                  <option value="travel">Academic Travel / Conference</option>
                  <option value="gadget">Peripherals / Gadget</option>
                  <option value="savings">Education Savings</option>
                  <option value="custom">Custom Milestone</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Target Points (Min: 10,000)
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="10000"
                  min="10000"
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: parseInt(e.target.value) || 0 })}
                  required
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Equivalent Value: ₹{(((goalForm.targetAmount || 0) / 100) * 10).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Description / Justification
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Purpose of this milestone (optional)"
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowGoalModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Save Goal Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
