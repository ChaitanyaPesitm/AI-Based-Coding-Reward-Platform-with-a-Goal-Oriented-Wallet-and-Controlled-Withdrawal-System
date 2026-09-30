'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { problemsAPI, adsAPI } from '@/lib/api';
import Link from 'next/link';

export default function ProblemsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ difficulty: '', language: '', search: '' });
  const [sponsoredChallenges, setSponsoredChallenges] = useState([]);

  const fetchProblems = useCallback(async () => {
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
  }, [filter.difficulty, filter.language]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchProblems();
      adsAPI.getSponsoredChallenges()
        .then(res => setSponsoredChallenges(res.data.data || []))
        .catch(() => {});
    }
  }, [user, fetchProblems]);

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading challenge catalog...</span>
      </div>
    );
  }

  if (!user) return null;

  const filteredProblems = problems.filter(p => {
    if (filter.search && !p.title.toLowerCase().includes(filter.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const solvedCount = problems.filter(p => p.solved).length;

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '28px 20px 60px' }}>
        
        {/* Header */}
        <div style={{
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '16px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Curriculum Catalog • Multi-Language Sandbox
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
            Coding Challenges & Assessments
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
            Solve algorithmic problems to earn reward points. Submissions are compiled in a real sandbox and evaluated by Gemini AI.
          </p>
        </div>

        {/* Filter Controls Toolbar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px'
        }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search problem title..."
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Difficulty:</span>
            <select
              className="input-field"
              style={{ width: 'auto', minWidth: '130px', padding: '6px 12px', fontSize: '0.82rem' }}
              value={filter.difficulty}
              onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Runtime:</span>
            <select
              className="input-field"
              style={{ width: 'auto', minWidth: '130px', padding: '6px 12px', fontSize: '0.82rem' }}
              value={filter.language}
              onChange={(e) => setFilter({ ...filter, language: e.target.value })}
            >
              <option value="">All Languages</option>
              <option value="c">C (GCC)</option>
              <option value="python">Python 3</option>
              <option value="java">Java (OpenJDK)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem' }}>
            {solvedCount > 0 && (
              <span style={{ color: 'var(--easy)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✓</span> {solvedCount} Solved
              </span>
            )}
            <span style={{ color: 'var(--text-muted)' }}>
              {filteredProblems.length} challenge{filteredProblems.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Sponsored Challenges Row */}
        {sponsoredChallenges.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                Sponsored Industry Challenges
              </span>
              <span style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-muted)' }}>
                Verified Partner
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '12px' }}>
              {sponsoredChallenges.map(ch => (
                <div key={ch.id} className="panel-card" style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {ch.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {ch.description}
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--easy)', fontWeight: 600 }}>Prize: {ch.prize}</span>
                    <span style={{ color: 'var(--text-muted)' }}>Deadline: {ch.deadline}</span>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Sponsored by {ch.sponsor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problems List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredProblems.length > 0 ? (
            filteredProblems.map((problem) => (
              <Link key={problem._id} href={`/problems/${problem._id}`} style={{ textDecoration: 'none' }}>
                <div
                  className="panel-card"
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    gap: '16px',
                    flexWrap: 'wrap',
                    borderLeft: problem.solved ? '3px solid var(--easy)' : '3px solid transparent'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {problem.title}
                      </h3>
                      {problem.solved && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: 'var(--easy)',
                          background: 'var(--success-subtle)',
                          border: '1px solid var(--success-border)',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          ✓ Solved
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty}</span>
                      <span className={`badge-lang badge-${problem.language}`}>{problem.language}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {problem.basePoints}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Base Pts
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      →
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="panel-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                No challenges matched your filter criteria
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
                Reset the search, difficulty, or runtime filters to view available problems.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
