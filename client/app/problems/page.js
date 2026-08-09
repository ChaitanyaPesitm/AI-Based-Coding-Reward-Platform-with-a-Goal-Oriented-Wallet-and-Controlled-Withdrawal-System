'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { problemsAPI, adsAPI } from '@/lib/api';
import Link from 'next/link';

export default function ProblemsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ difficulty: '', language: '' });
  const [sponsoredChallenges, setSponsoredChallenges] = useState([]);

  const fetchProblems = async () => {
    try {
      const params = {};
      if (filter.difficulty) params.difficulty = filter.difficulty;
      if (filter.language) params.language = filter.language;
      const res = await problemsAPI.getAll(params);
      setProblems(res.data.data);
    } catch (err) {
      console.error('Failed to fetch problems:', err);
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
      fetchProblems();
      adsAPI.getSponsoredChallenges()
        .then(res => setSponsoredChallenges(res.data.data || []))
        .catch(() => {});
    }
  }, [user, filter]);

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  const solvedCount = problems.filter(p => p.solved).length;

  return (
    <div className="bg-grid" style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
      <div className="bg-glow-orb" style={{ top: '20%', left: '5%', background: 'var(--accent-secondary)' }} />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <div className="animate-fade-in-up" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            💻 Coding <span className="gradient-text">Problems</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Solve problems to earn reward points. Better code quality = more points!
          </p>
        </div>

        {/* Filters + Stats */}
        <div className="animate-fade-in-up delay-100" style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: '160px' }}
            value={filter.difficulty}
            onChange={(e) => setFilter({...filter, difficulty: e.target.value})}
          >
            <option value="">All Difficulties</option>
            <option value="easy">🟢 Easy</option>
            <option value="medium">🟡 Medium</option>
            <option value="hard">🔴 Hard</option>
          </select>

          <select
            className="input-field"
            style={{ width: 'auto', minWidth: '160px' }}
            value={filter.language}
            onChange={(e) => setFilter({...filter, language: e.target.value})}
          >
            <option value="">All Languages</option>
            <option value="c">C</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {solvedCount > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--easy)', fontWeight: 600 }}>
                ✅ {solvedCount} solved
              </span>
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{problems.length} problems</span>
          </div>
        </div>

        {/* Sponsored Challenges */}
        {sponsoredChallenges.length > 0 && (
          <div className="animate-fade-in-up delay-200" style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>🎁 Sponsored Challenges</h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sponsored</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {sponsoredChallenges.map(ch => (
                <div key={ch.id} className="glass-card" style={{ padding: '16px 20px', borderColor: 'rgba(108, 99, 255, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px' }}>{ch.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ch.description}</div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--easy)', fontWeight: 700 }}>Prize: {ch.prize}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deadline: {ch.deadline}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>by {ch.sponsor}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problems List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {problems.length > 0 ? (
            problems.map((problem, i) => (
              <Link key={problem._id} href={`/problems/${problem._id}`} style={{ textDecoration: 'none' }}>
                <div
                  className="glass-card animate-fade-in-up"
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    animationDelay: `${i * 50}ms`,
                    opacity: 0,
                    gap: '16px',
                    flexWrap: 'wrap',
                    // Subtle green tint for solved problems
                    borderColor: problem.solved ? 'rgba(16, 185, 129, 0.2)' : undefined
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {problem.title}
                      </h3>
                      {problem.solved && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--easy)',
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          letterSpacing: '0.3px'
                        }}>
                          ✓ Solved
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty}</span>
                      <span className={`badge-lang badge-${problem.language}`}>{problem.language}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800 }} className="gradient-text">
                        {problem.basePoints}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>base pts</div>
                    </div>
                    {problem.solved ? (
                      <span style={{ fontSize: '1.2rem', color: 'var(--easy)' }}>✓</span>
                    ) : (
                      <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>→</span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="glass-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: '3rem' }}>📭</span>
              <h3 style={{ marginTop: '12px', fontWeight: 700 }}>No problems found</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>
                Try changing the filters or check back later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
