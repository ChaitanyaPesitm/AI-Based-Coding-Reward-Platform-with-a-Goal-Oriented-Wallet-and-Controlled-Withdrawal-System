'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { leaderboardAPI } from '@/lib/api';

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

const BADGE_DESCRIPTIONS = {
  first_solve:      'Completed first verified challenge',
  problems_10:      'Solved 10 curriculum challenges',
  problems_25:      'Solved 25 curriculum challenges',
  problems_50:      'Solved 50 curriculum challenges',
  points_1000:      'Accumulated 1,000 challenge credits',
  points_5000:      'Accumulated 5,000 challenge credits',
  points_10000:     'Accumulated 10,000 challenge credits',
  streak_7:         'Maintained continuous 7-day solve activity',
  streak_30:        'Maintained continuous 30-day solve activity',
  no_plagiarism_10: '10 consecutive submissions with zero violations'
};

const RANK_BADGES = {
  1: { label: '1st', color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.3)' },
  2: { label: '2nd', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)' },
  3: { label: '3rd', color: '#b45309', bg: 'rgba(180, 83, 9, 0.12)', border: 'rgba(180, 83, 9, 0.3)' }
};

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      leaderboardAPI.getTop(20)
        .then(res => {
          setData(res.data.data || []);
          setMyRank(res.data.myRank || null);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculating academic standings...</span>
      </div>
    );
  }

  if (!user) return null;

  const myEntry = data.find(d => d.id === user.id) || myRank;

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Header */}
        <div style={{
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '16px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Academic Standings • Peer Benchmarks
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
            Performance Leaderboard & Badges
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
            Rankings ranked by verified reward points earned across algorithmic problem sets.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={activeTab === 'leaderboard' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
          >
            Rankings
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={activeTab === 'badges' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
          >
            Milestone Badges
          </button>
        </div>

        {activeTab === 'leaderboard' && (
          <>
            {/* My Rank Summary */}
            {myRank && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 18px',
                borderRadius: '8px',
                background: 'var(--primary-subtle)',
                border: '1px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: 'var(--primary)',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    #{myRank.rank}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Your Standing</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solve more challenges to advance in the rankings</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {myRank.totalPointsEarned.toLocaleString()} points
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {myRank.problemsSolved} verified solves
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 Podium (Clean Restrained Format) */}
            {data.length >= 3 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {[data[0], data[1], data[2]].map((entry, idx) => {
                  if (!entry) return null;
                  const rank = idx + 1;
                  const meta = RANK_BADGES[rank];
                  const isMe = entry.id === user.id;

                  return (
                    <div
                      key={entry.id}
                      className="panel-card"
                      style={{
                        padding: '16px 20px',
                        borderTop: `3px solid ${meta.color}`,
                        border: isMe ? '1px solid var(--primary)' : undefined,
                        background: isMe ? 'var(--primary-subtle)' : 'var(--bg-card)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`
                        }}>
                          {meta.label} Place
                        </span>
                        {entry.currentStreak > 0 && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>
                            {entry.currentStreak}-day streak
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {entry.name} {isMe && <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>(You)</span>}
                      </div>

                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                        {entry.totalPointsEarned.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>pts</span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {entry.problemsSolved} problems solved
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Complete Standings Table */}
            <div className="panel-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                      <th>Candidate Name</th>
                      <th>Total Points</th>
                      <th>Problems Solved</th>
                      <th>Streak</th>
                      <th>Badges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(entry => {
                      const isMe = entry.id === user.id;
                      return (
                        <tr key={entry.id} style={{ background: isMe ? 'var(--primary-subtle)' : undefined }}>
                          <td style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                            #{entry.rank}
                          </td>
                          <td style={{ fontWeight: isMe ? 700 : 500 }}>
                            {entry.name}
                            {isMe && (
                              <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>
                                (Current User)
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                            {entry.totalPointsEarned.toLocaleString()}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {entry.problemsSolved}
                          </td>
                          <td style={{ color: entry.currentStreak > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            {entry.currentStreak > 0 ? `${entry.currentStreak}d` : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(entry.badges || []).slice(0, 3).map(b => (
                                <span key={b} className="badge" style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                                  {BADGE_META[b]?.label || b}
                                </span>
                              ))}
                              {(entry.badges || []).length > 3 && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                  +{entry.badges.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {data.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          No candidates recorded on the leaderboard.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Milestone Badges Tab */}
        {activeTab === 'badges' && (
          <div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)'
            }}>
              Curriculum badges are unlocked automatically upon satisfying verification criteria in the evaluation sandbox.
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px'
            }}>
              {Object.entries(BADGE_META).map(([id, meta]) => {
                const earned = (myEntry?.badges || user.badges || []).includes(id);
                return (
                  <div
                    key={id}
                    className="panel-card"
                    style={{
                      padding: '16px',
                      opacity: earned ? 1 : 0.5,
                      border: earned ? `1px solid ${meta.color}` : '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: meta.bg,
                        color: meta.color
                      }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: earned ? 'var(--easy)' : 'var(--text-muted)' }}>
                        {earned ? '✓ Unlocked' : 'Locked'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {BADGE_DESCRIPTIONS[id]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
