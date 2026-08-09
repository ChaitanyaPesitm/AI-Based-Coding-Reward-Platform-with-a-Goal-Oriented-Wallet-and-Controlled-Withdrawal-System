'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { problemsAPI, submissionsAPI, settingsAPI } from '@/lib/api';
import dynamic from 'next/dynamic';
import ProctoringOverlay from '@/components/ProctoringOverlay';

// Dynamically import Monaco Editor (no SSR)
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const MONACO_LANG_MAP = {
  c: 'c',
  python: 'python',
  java: 'java'
};

export default function SolveProblemPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Rewarded Ad Hint State
  const [showAdModal, setShowAdModal] = useState(false);
  const [adTimer, setAdTimer] = useState(5);
  const [adWatching, setAdWatching] = useState(false);
  const [hintUnlocked, setHintUnlocked] = useState(false);
  const [aiHintText, setAiHintText] = useState('');

  // Proctoring state
  const [proctorViolations, setProctorViolations] = useState([]);
  const [proctorViolationCount, setProctorViolationCount] = useState(0);
  const [proctorFlagged, setProctorFlagged] = useState(false);
  const [proctoringEnabled, setProctoringEnabled] = useState(true);

  const fetchProblem = async () => {
    try {
      const [res, settingsRes] = await Promise.all([
        problemsAPI.getById(params.id),
        settingsAPI.get().catch(() => ({ data: { data: { proctoringEnabled: true } } }))
      ]);
      setProblem(res.data.data);
      setCode(res.data.data.starterCode || '');
      setProctoringEnabled(settingsRes.data.data?.proctoringEnabled !== false);
    } catch (err) {
      console.error('Failed to fetch problem:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && params.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProblem();
    }
  }, [user, params.id]);

  const handleStartAd = () => {
    setShowAdModal(true);
    setAdWatching(true);
    setAdTimer(5);

    const interval = setInterval(() => {
      setAdTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setAdWatching(false);
          setHintUnlocked(true);
          setAiHintText(
            `💡 AI Hint for "${problem.title}": Pay special attention to edge cases (e.g. empty input or boundary values). Break down your solution logic into distinct steps!`
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await submissionsAPI.submit({
        problemId: params.id,
        code,
        language: problem.language,
        proctorViolations: proctorViolationCount,
        proctorFlagged
      });
      setResult(res.data.data);
    } catch (err) {
      setResult({
        error: err.response?.data?.message || 'Submission failed. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProctorViolation = (violation, count) => {
    setProctorViolations(prev => [...prev, violation]);
    setProctorViolationCount(count);
    // Flag if 3+ violations or any tab switch
    if (count >= 3 || violation.type === 'tab_switch') {
      setProctorFlagged(true);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user || !problem) return null;

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{
        padding: '12px 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/problems')}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            ← Back
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{problem.title}</h2>
          <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty}</span>
          <span className={`badge-lang badge-${problem.language}`}>{problem.language}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Rewarded Ad AI Hint Button */}
          <button
            onClick={() => setShowAdModal(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              background: 'rgba(251, 191, 36, 0.1)',
              color: '#fbbf24',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🎬 {hintUnlocked ? 'View AI Hint' : 'Unlock AI Hint (+5% Bonus)'}
          </button>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Base Points: <strong style={{ color: 'var(--accent-primary)' }}>{problem.basePoints}</strong>
          </span>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
            style={{ padding: '8px 24px', fontSize: '0.85rem' }}
          >
            {submitting ? '⏳ Evaluating...' : '▶ Submit Code'}
          </button>
        </div>
      </div>

      {/* Main Content: Split Panel */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 0
      }}>
        {/* Left: Problem Description */}
        <div style={{
          borderRight: '1px solid var(--border-subtle)',
          overflow: 'auto',
          padding: '24px',
          background: 'var(--bg-primary)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>{problem.title}</h3>

          <div style={{
            fontSize: '0.9rem',
            lineHeight: 1.8,
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap'
          }}>
            {problem.description}
          </div>

          {/* AI Hint Display Box */}
          {hintUnlocked && aiHintText && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: '#fef08a'
            }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>💡 AI Hint Unlocked!</h4>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{aiHintText}</p>
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                ✨ 5% Bonus Point Multiplier Activated for your next submission!
              </div>
            </div>
          )}

          {problem.constraints && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>Constraints</h4>
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                fontSize: '0.85rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-secondary)'
              }}>
                {problem.constraints}
              </div>
            </div>
          )}

          {problem.sampleInput && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>Sample Input</h4>
              <pre style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                fontSize: '0.85rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--easy)',
                overflow: 'auto'
              }}>
                {problem.sampleInput}
              </pre>
            </div>
          )}

          {problem.sampleOutput && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>Sample Output</h4>
              <pre style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                fontSize: '0.85rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--accent-primary)',
                overflow: 'auto'
              }}>
                {problem.sampleOutput}
              </pre>
            </div>
          )}

          {/* Submission Result */}
          {result && (
            <div style={{ marginTop: '24px' }}>
              <ResultPanel result={result} />
            </div>
          )}
        </div>

        {/* Right: Code Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
          <div style={{
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              📝 {problem.language.toUpperCase()} Editor
            </span>
            <button
              onClick={() => setCode(problem.starterCode || '')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              ↺ Reset Code
            </button>
          </div>

          <div style={{ flex: 1, minHeight: '400px' }}>
            <Editor
              height="100%"
              language={MONACO_LANG_MAP[problem.language]}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                lineNumbers: 'on',
                roundedSelection: true,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                suggestOnTriggerCharacters: true
              }}
            />
          </div>
        </div>
      </div>

      {/* Rewarded Ad Hint Modal */}
      {showAdModal && (
        <div className="modal-overlay" onClick={() => !adWatching && setShowAdModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px' }}>
              🎬 Rewarded Ad — Unlock AI Hint
            </h3>

            {!hintUnlocked ? (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Watch this 5-second sponsored ad to unlock a personalized AI Hint & earn a 5% bonus point multiplier!
                </p>

                {/* Simulated Sponsored Ad Player */}
                <div style={{
                  padding: '30px 20px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                  border: '2px dashed #6366f1',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💻 🚀</div>
                  <h4 style={{ color: '#a5f3fc', fontWeight: 700 }}>Amazon & Coursera Tech Deals</h4>
                  <p style={{ fontSize: '0.8rem', color: '#c7d2fe', marginTop: '4px' }}>
                    Upgrade your laptop & get certified in Full-Stack AI Development!
                  </p>

                  {adWatching && (
                    <div style={{ marginTop: '16px', fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>
                      ⏳ Watching Ad... {adTimer}s
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdModal(false)} disabled={adWatching}>
                    Close
                  </button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleStartAd} disabled={adWatching}>
                    {adWatching ? `Watching (${adTimer}s)` : '▶ Start Rewarded Ad'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', margin: '12px 0' }}>🎉</div>
                <h4 style={{ color: '#10b981', fontWeight: 800, marginBottom: '8px' }}>AI Hint Unlocked!</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  {aiHintText}
                </p>
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowAdModal(false)}>
                  Got It! Return to Code Editor
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Proctoring Overlay */}
      <ProctoringOverlay
        problemId={params.id}
        onViolation={handleProctorViolation}
        enabled={proctoringEnabled}
      />

      <style jsx>{`
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: '1fr 1fr'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// Result Panel Component
function ResultPanel({ result }) {
  if (result.error) {
    return (
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)'
      }}>
        <h4 style={{ color: '#f87171', fontWeight: 700, marginBottom: '8px' }}>❌ Error</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{result.error}</p>
      </div>
    );
  }

  const sub = result.submission;
  const ai = result.aiEvaluation;
  const breakdown = result.pointsBreakdown;
  const isAccepted = sub?.status === 'accepted';

  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        background: isAccepted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        border: `1px solid ${isAccepted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h4 style={{
            color: isAccepted ? 'var(--easy)' : 'var(--medium)',
            fontWeight: 700,
            fontSize: '1.1rem'
          }}>
            {isAccepted ? '✅ Accepted!' : `⚠️ ${sub?.status?.replace(/_/g, ' ').toUpperCase()}`}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Test Cases: {sub?.testCasesPassed}/{sub?.totalTestCases} passed
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900 }} className="gradient-text">
            +{result.pointsEarned}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>points earned</div>
        </div>
      </div>

      {ai && (
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>🤖 AI Code Evaluation</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: '10px', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: ai.score >= 70 ? 'var(--easy)' : ai.score >= 40 ? 'var(--medium)' : 'var(--hard)' }}>
                {ai.score}/100
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Overall Score</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: '10px', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-primary)' }}>
                {ai.timeComplexity}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Time Complexity</div>
              {ai.complexityComparison?.time && (
                <div style={{ fontSize: '0.65rem', marginTop: '4px', color: ai.complexityComparison.time.isOptimal ? 'var(--easy)' : 'var(--hard)', fontWeight: 600 }}>
                  {ai.complexityComparison.time.isOptimal ? '✓ Optimal' : '⚠ Suboptimal'}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: '10px', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-secondary)' }}>
                {ai.spaceComplexity}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Space Complexity</div>
              {ai.complexityComparison?.space && (
                <div style={{ fontSize: '0.65rem', marginTop: '4px', color: ai.complexityComparison.space.isOptimal ? 'var(--easy)' : 'var(--hard)', fontWeight: 600 }}>
                  {ai.complexityComparison.space.isOptimal ? '✓ Optimal' : '⚠ Suboptimal'}
                </div>
              )}
            </div>
          </div>

          {ai.complexityComparison && (
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!ai.complexityComparison.time.isOptimal && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.8rem', color: 'var(--medium)' }}>
                  ⏱️ {ai.complexityComparison.time.message}
                </div>
              )}
              {!ai.complexityComparison.space.isOptimal && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.8rem', color: 'var(--medium)' }}>
                  💾 {ai.complexityComparison.space.message}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <QualityBar label="Code Quality" value={ai.codeQuality} />
            <QualityBar label="Efficiency" value={ai.efficiency} />
          </div>

          {ai.suggestions && (
            <div style={{ marginTop: '14px', padding: '12px', borderRadius: '8px', background: 'var(--bg-card)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              💡 <strong>Suggestion:</strong> {ai.suggestions}
            </div>
          )}

          {ai.strengths && (
            <div style={{ marginTop: '8px', padding: '12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', fontSize: '0.85rem', color: 'var(--easy)', lineHeight: 1.6 }}>
              ✨ <strong>Strengths:</strong> {ai.strengths}
            </div>
          )}
        </div>
      )}

      {breakdown && (
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-muted)'
        }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Points Formula:</strong>
          <br />
          {breakdown.formula}
        </div>
      )}
    </div>
  );
}

function QualityBar({ label, value }) {
  const color = value >= 70 ? 'var(--easy)' : value >= 40 ? 'var(--medium)' : 'var(--hard)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>{value}/100</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg-card)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: color,
          borderRadius: '3px',
          transition: 'width 0.8s ease'
        }} />
      </div>
    </div>
  );
}
