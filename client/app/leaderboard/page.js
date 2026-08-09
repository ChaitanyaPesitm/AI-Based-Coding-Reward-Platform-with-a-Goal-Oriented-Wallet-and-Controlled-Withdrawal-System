'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { leaderboardAPI } from '@/lib/api';

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

const RANK_STYLES = {
  1: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', label: '🥇' },
  2: { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', label: '🥈' },
  3: { bg: 'linear-gradient(135deg, #cd7c2f, #a16207)', label: '🥉' }
};

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'badges'

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  const myEntry = data.find(d => d.id === user.id) || myRank;

  return (
    <div className="bg-grid" style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
      <div className="bg-glow-orb" style={{ top: '10%', right: '5%', background: 'var(--accent-tertiary)' }} />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div className="animate-fade-in-up" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            🏆 <span className="gradient-text">Leaderboard</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Top coders ranked by total reward points
          </p>
        </div>

        {/* Tabs */}
        <div className="animate-fade-in-up delay-100" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['leaderboard', 'badges'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                background: activeTab === tab ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                color: activeTab === tab ? 'white' : 'var(--text-secondary)'
              }}
            >
              {tab === 'leaderboard' ? '📊 Rankings' : '🎖️ Badges'}
            </button>
          ))}
        </div>

        {activeTab === 'leaderboard' && (
          <>
            {/* My Rank Card (if not in top 20) */}
            {myRank && (
              <div className="animate-fade-in-up delay-100" style={{
                marginBottom: '20px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(108, 99, 255, 0.1)',
                border: '1px solid rgba(108, 99, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    #{myRank.rank}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700 }}>Your Rank</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Keep solving to climb!</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800 }} className="gradient-text">{myRank.totalPointsEarned.toLocaleString()} pts</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{myRank.problemsSolved} solved</div>
                </div>
              </div>
            )}

            {/* Top 3 Podium */}
            {data.length >= 3 && (
              <div className="animate-fade-in-up delay-200" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.1fr 1fr',
                gap: '12px',
                marginBottom: '24px'
              }}>
                {[data[1], data[0], data[2]].map((entry, idx) => {
                  if (!entry) return <div key={idx} />;
                  const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
                  const style = RANK_STYLES[rank];
                  const isMe = entry.id === user.id;
                  return (
                    <div key={entry.id} style={{
                      padding: '20px 16px',
                      borderRadius: '16px',
                      background: 'var(--bg-card)',
                      border: isMe ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: rank === 1 ? 0 : '16px'
                    }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: style.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', fontWeight: 800
                      }}>
                        {style.label}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {entry.name}{isMe ? ' (You)' : ''}
                      </div>
                      <div className="gradient-text" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                        {entry.totalPointsEarned.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {entry.problemsSolved} solved
                      </div>
                      {entry.currentStreak > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#fb923c' }}>
                          🔥 {entry.currentStreak}-day streak
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full Rankings Table */}
            <div className="glass-card animate-fade-in-up delay-300" style={{ padding: '0', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '20px' }}>Rank</th>
                    <th>Name</th>
                    <th>Points</th>
                    <th>Solved</th>
                    <th>Streak</th>
                    <th>Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(entry => {
                    const isMe = entry.id === user.id;
                    const rankStyle = RANK_STYLES[entry.rank];
                    return (
                      <tr key={entry.id} style={{ background: isMe ? 'rgba(108, 99, 255, 0.05)' : undefined }}>
                        <td style={{ paddingLeft: '20px', fontWeight: 700 }}>
                          {rankStyle ? (
                            <span>{rankStyle.label}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>#{entry.rank}</span>
                          )}
                        </td>
                        <td style={{ fontWeight: isMe ? 700 : 500 }}>
                          {entry.name}
                          {isMe && (
                            <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                              (You)
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="gradient-text" style={{ fontWeight: 800 }}>
                            {entry.totalPointsEarned.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{entry.problemsSolved}</td>
                        <td style={{ color: '#fb923c' }}>
                          {entry.currentStreak > 0 ? `🔥 ${entry.currentStreak}` : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(entry.badges || []).slice(0, 3).map(b => (
                              <span key={b} title={BADGE_META[b]?.label || b} style={{
                                fontSize: '1rem', cursor: 'default'
                              }}>
                                {(BADGE_META[b]?.label || b).split(' ')[0]}
                              </span>
                            ))}
                            {(entry.badges || []).length > 3 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No data yet — be the first to solve a problem!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'badges' && (
          <div className="animate-fade-in-up delay-200">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Earn badges by hitting milestones. Your earned badges are highlighted.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px'
            }}>
              {Object.entries(BADGE_META).map(([id, { label, color }]) => {
                const earned = (myEntry?.badges || user.badges || []).includes(id);
                return (
                  <div key={id} className="glass-card" style={{
                    padding: '20px',
                    opacity: earned ? 1 : 0.45,
                    borderColor: earned ? color + '40' : undefined,
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                      {label.split(' ')[0]}
                    </div>
                    <div style={{ fontWeight: 700, color: earned ? color : 'var(--text-secondary)' }}>
                      {label.split(' ').slice(1).join(' ')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {BADGE_DESCRIPTIONS[id]}
                    </div>
                    {earned && (
                      <div style={{ marginTop: '10px', fontSize: '0.72rem', fontWeight: 700, color: color }}>
                        ✓ EARNED
                      </div>
                    )}
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

const BADGE_DESCRIPTIONS = {
  first_solve:      'Solved your first problem',
  problems_10:      'Solved 10 problems',
  problems_25:      'Solved 25 problems',
  problems_50:      'Solved 50 problems',
  points_1000:      'Earned 1,000 total points',
  points_5000:      'Earned 5,000 total points',
  points_10000:     'Earned 10,000 total points',
  streak_7:         'Maintained a 7-day activity streak',
  streak_30:        'Maintained a 30-day activity streak',
  no_plagiarism_10: '10 submissions with no plagiarism flag'
};
