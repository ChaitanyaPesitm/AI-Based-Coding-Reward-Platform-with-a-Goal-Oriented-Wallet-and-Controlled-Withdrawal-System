'use client';
import { useState, useEffect, useRef } from 'react';
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
  const [hintLoading, setHintLoading] = useState(false);
  const [aiHintText, setAiHintText] = useState('');

  // Phase 3: Senior Dev Review state
  const [seniorDevQuestion, setSeniorDevQuestion] = useState(null);
  const [seniorDevAnswer, setSeniorDevAnswer] = useState('');
  const [seniorDevGrading, setSeniorDevGrading] = useState(false);
  const [seniorDevResult, setSeniorDevResult] = useState(null);

  // Phase 4: Rubber Duck state
  const [showDuck, setShowDuck] = useState(false);
  const [duckMessage, setDuckMessage] = useState('');
  const [duckHistory, setDuckHistory] = useState([]);
  const [duckLoading, setDuckLoading] = useState(false);
  const duckEndRef = useRef(null);

  // Proctoring state
  const [proctoringEnabled, setProctoringEnabled] = useState(true);

  const fetchProblem = async () => {
    try {
      const [res, settingsRes] = await Promise.all([
        problemsAPI.getById(params.id),
        settingsAPI.get().catch(() => ({ data: { data: { proctoringEnabled: true } } }))
      ]);
      const fetchedProblem = res.data.data;
      setProblem(fetchedProblem);
      
      const userKey = user?.id || user?._id || 'guest';
      const savedCode = localStorage.getItem(`code_${userKey}_${fetchedProblem._id}_${fetchedProblem.language}`);
      setCode(savedCode !== null ? savedCode : (fetchedProblem.starterCode || ''));
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
      fetchProblem();
    }
  }, [user, params.id]);

  const handleCodeChange = (value) => {
    const newCode = value || '';
    setCode(newCode);
    if (problem) {
      const userKey = user?.id || user?._id || 'guest';
      localStorage.setItem(`code_${userKey}_${problem._id}_${problem.language}`, newCode);
    }
  };

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
          setHintLoading(true);

          // Request AI Hint from server
          problemsAPI.unlockHint(params.id, { code, language: problem?.language })
            .then(res => {
              const returnedHint = res.data?.data?.hint;
              if (returnedHint) {
                setAiHintText(returnedHint);
              }
            })
            .catch(err => {
              console.warn('Hint unlock warning:', err);
              setAiHintText(
                'Algorithmic Suggestion: Validate boundary constraints (e.g. empty or negative inputs). Break down the problem step-by-step before writing code!'
              );
            })
            .finally(() => {
              setHintLoading(false);
            });
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
    setSeniorDevQuestion(null);
    setSeniorDevResult(null);
    setSeniorDevAnswer('');
    try {
      const res = await submissionsAPI.submit({
        problemId: params.id,
        code,
        language: problem.language
      });
      setResult(res.data.data);
      if (res.data.data?.seniorDevQuestion) {
        setSeniorDevQuestion(res.data.data.seniorDevQuestion);
      }
    } catch (err) {
      setResult({
        error: err.response?.data?.message || 'Submission failed. Please check runtime errors.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeniorDevSubmit = async () => {
    if (!seniorDevAnswer.trim() || !seniorDevQuestion) return;
    setSeniorDevGrading(true);
    try {
      const res = await problemsAPI.seniorDevAnswer(params.id, {
        question: seniorDevQuestion,
        answer: seniorDevAnswer
      });
      setSeniorDevResult(res.data.data);
    } catch {
      setSeniorDevResult({ correct: false, feedback: 'Evaluation failed. Please try again.', bonusPoints: 0 });
    } finally {
      setSeniorDevGrading(false);
    }
  };

  const handleDuckSubmit = async (e) => {
    e?.preventDefault();
    const cleanMsg = duckMessage.trim();
    if (!cleanMsg || duckLoading) return;

    const newHistory = [...duckHistory, { role: 'user', content: cleanMsg }];
    setDuckHistory(newHistory);
    setDuckMessage('');
    setDuckLoading(true);

    try {
      const res = await problemsAPI.rubberDuckChat(params.id, {
        message: cleanMsg,
        code,
        history: duckHistory
      });
      const duckReply = res.data?.data?.reply || "Quack! I hear you. What happens if you trace the loop with an example?";
      setDuckHistory([...newHistory, { role: 'assistant', content: duckReply }]);
    } catch (err) {
      console.warn('Rubber Duck error:', err);
      setDuckHistory([
        ...newHistory,
        {
          role: 'assistant',
          content: "Quack! Let's think: what does the problem ask for as input, and what should the output look like at each step?"
        }
      ]);
    } finally {
      setDuckLoading(false);
      setTimeout(() => {
        duckEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Initializing IDE & sandbox environment...</span>
      </div>
    );
  }

  if (!user || !problem) return null;

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top IDE Toolbar */}
      <div style={{
        padding: '10px 20px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-medium)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => router.push('/problems')}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
          >
            ← Catalog
          </button>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {problem.title}
          </h2>
          <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty}</span>
          <span className={`badge-lang badge-${problem.language}`}>{problem.language}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Rewarded Ad Hint Trigger */}
          <button
            onClick={() => setShowAdModal(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: hintUnlocked ? '1px solid var(--success-border)' : '1px solid var(--warning-border)',
              background: hintUnlocked ? 'var(--success-subtle)' : 'var(--warning-subtle)',
              color: hintUnlocked ? 'var(--easy)' : 'var(--warning)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{hintUnlocked ? '✓' : '💡'}</span>
            <span>{hintUnlocked ? 'View AI Hint' : 'Unlock AI Hint (+5% Bonus)'}</span>
          </button>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Base Value: <strong style={{ color: 'var(--text-primary)' }}>{problem.basePoints} pts</strong>
          </span>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
            style={{ padding: '6px 18px', fontSize: '0.82rem' }}
          >
            {submitting ? 'Compiling & Evaluating...' : 'Execute & Submit'}
          </button>
        </div>
      </div>

      {/* Main Split Panel */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 0
      }}>
        {/* Left Pane: Instructions & Results */}
        <div style={{
          borderRight: '1px solid var(--border-medium)',
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--bg-primary)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              Problem Specification
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {problem.title}
            </h3>
          </div>

          <div style={{
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap'
          }}>
            {problem.description}
          </div>

          {/* AI Hint Box */}
          {hintUnlocked && aiHintText && (
            <div style={{
              marginTop: '18px',
              padding: '14px 16px',
              borderRadius: '8px',
              background: 'var(--warning-subtle)',
              border: '1px solid var(--warning-border)',
              color: 'var(--text-primary)'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                AI Hint Active (+5% Bonus Multiplier Applied)
              </div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.55 }}>{aiHintText}</p>
            </div>
          )}

          {/* Constraints */}
          {problem.constraints && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Constraints
              </h4>
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-secondary)'
              }}>
                {problem.constraints}
              </div>
            </div>
          )}

          {/* Sample Input */}
          {problem.sampleInput && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Sample Input
              </h4>
              <pre style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-primary)',
                overflowX: 'auto'
              }}>
                {problem.sampleInput}
              </pre>
            </div>
          )}

          {/* Sample Output */}
          {problem.sampleOutput && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Sample Output
              </h4>
              <pre style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-primary)',
                overflowX: 'auto'
              }}>
                {problem.sampleOutput}
              </pre>
            </div>
          )}

          {/* Submission Evaluation Results */}
          {result && (
            <div style={{ marginTop: '24px' }}>
              <ResultPanel result={result} />
            </div>
          )}

          {/* Phase 3: AI Dynamic Edge Case Results */}
          {result?.edgeCaseSummary && (
            <div style={{
              marginTop: '16px',
              padding: '14px 16px',
              borderRadius: '8px',
              background: result.edgeCaseSummary.allPassed ? 'var(--success-subtle)' : 'var(--warning-subtle)',
              border: `1px solid ${result.edgeCaseSummary.allPassed ? 'var(--success-border)' : 'var(--warning-border)'}`
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', color: result.edgeCaseSummary.allPassed ? 'var(--easy)' : 'var(--warning)' }}>
                AI-Generated Edge Cases — {result.edgeCaseSummary.passed}/{result.edgeCaseSummary.total} Passed
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.edgeCaseResults?.map((ec, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', padding: '6px 10px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                      Input: {ec.input || '(empty)'}
                    </span>
                    <span style={{ fontWeight: 700, color: ec.passed ? 'var(--easy)' : 'var(--hard)', whiteSpace: 'nowrap' }}>
                      {ec.passed ? '✓ Pass' : `✗ ${ec.status}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 3: Senior Dev Follow-up Question */}
          {seniorDevQuestion && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Senior Dev Code Review (+20 pts if correct)
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '12px' }}>
                {seniorDevQuestion}
              </p>

              {!seniorDevResult ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    value={seniorDevAnswer}
                    onChange={(e) => setSeniorDevAnswer(e.target.value)}
                    placeholder="Type your conceptual answer here..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-medium)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      resize: 'vertical',
                      minHeight: '60px',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button
                    className="btn-primary"
                    onClick={handleSeniorDevSubmit}
                    disabled={seniorDevGrading || !seniorDevAnswer.trim()}
                    style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
                  >
                    {seniorDevGrading ? 'Evaluating...' : 'Submit Answer'}
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  background: seniorDevResult.correct ? 'var(--success-subtle)' : 'var(--danger-subtle)',
                  border: `1px solid ${seniorDevResult.correct ? 'var(--success-border)' : 'var(--danger-border)'}`
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: seniorDevResult.correct ? 'var(--easy)' : 'var(--hard)' }}>
                    {seniorDevResult.correct ? `✓ Correct! +${seniorDevResult.bonusPoints} pts awarded` : '✗ Needs More Depth'}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                    {seniorDevResult.feedback}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Code Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
          <div style={{
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Monaco Editor • {problem.language.toUpperCase()}
            </span>
            <button
              onClick={() => {
                const starter = problem.starterCode || '';
                setCode(starter);
                const userKey = user?.id || user?._id || 'guest';
                localStorage.setItem(`code_${userKey}_${problem._id}_${problem.language}`, starter);
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-medium)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              Reset Starter Code
            </button>
          </div>

          <div style={{ flex: 1, minHeight: '400px' }}>
            <Editor
              height="100%"
              language={MONACO_LANG_MAP[problem.language]}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                lineNumbers: 'on',
                roundedSelection: true,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on'
              }}
            />
          </div>
        </div>
      </div>

      {/* Rewarded Ad Hint Modal */}
      {showAdModal && (
        <div className="modal-overlay" onClick={() => !adWatching && setShowAdModal(false)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                Assessment Assistance
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                Unlock Gemini AI Hint
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Review this verified academic sponsor notice for 5 seconds to unlock an algorithmic hint and a +5% reward bonus.
              </p>
            </div>

            {!hintUnlocked ? (
              <>
                <div style={{
                  padding: '20px 16px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-medium)',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Sponsored Sponsor Notice</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                    Student Cloud & Development Tooling Grants
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Complimentary developer credits for verified VTU computer science students.
                  </div>

                  {adWatching && (
                    <div style={{ marginTop: '14px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--warning)' }}>
                      Verifying notice... {adTimer}s remaining
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdModal(false)} disabled={adWatching}>
                    Cancel
                  </button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleStartAd} disabled={adWatching}>
                    {adWatching ? `Verifying (${adTimer}s)` : 'Begin 5s Verification'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'var(--success-subtle)',
                  border: '1px solid var(--success-border)',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--easy)' }}>
                    ✓ AI Hint Activated
                  </div>
                  {hintLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <div className="spinner" style={{ width: '14px', height: '14px' }} />
                      <span>Consulting Socratic AI mentor for your code...</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {aiHintText || 'Break down the problem step-by-step and inspect sample test cases.'}
                    </p>
                  )}
                </div>
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowAdModal(false)}>
                  Return to Workspace
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Phase 4: Rubber Duck Debugging Chat Widget */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px'
      }}>
        {showDuck && (
          <div style={{
            width: '340px', background: 'var(--bg-primary)',
            border: '1px solid var(--border-medium)', borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>🦆 Rubber Duck Mentor</span>
              <button onClick={() => setShowDuck(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
            <div style={{ height: '300px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '12px', borderTopLeftRadius: '2px', fontSize: '0.8rem', maxWidth: '85%' }}>
                Quack! I'm here to help you debug. I won't write code for you, but I can help you talk through your logic. What's stuck?
              </div>
              {duckHistory.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-secondary)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  borderTopRightRadius: msg.role === 'user' ? '2px' : '12px',
                  borderTopLeftRadius: msg.role === 'assistant' ? '2px' : '12px',
                  fontSize: '0.8rem',
                  maxWidth: '85%',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              ))}
              {duckLoading && (
                <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                  Duck is thinking...
                </div>
              )}
              <div ref={duckEndRef} />
            </div>
            <form onSubmit={handleDuckSubmit} style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', background: 'var(--bg-secondary)' }}>
              <input
                type="text"
                value={duckMessage}
                onChange={(e) => setDuckMessage(e.target.value)}
                placeholder="Talk to the duck..."
                style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--border-medium)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                disabled={duckLoading}
              />
              <button type="submit" disabled={duckLoading || !duckMessage.trim()} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                ↑
              </button>
            </form>
          </div>
        )}
        {!showDuck && (
          <button
            onClick={() => setShowDuck(true)}
            style={{
              width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-primary)',
              border: '2px solid var(--border-medium)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center',
              cursor: 'pointer', transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title="Talk to Rubber Duck"
          >
            🦆
          </button>
        )}
      </div>

      {/* Proctoring Overlay */}
      <ProctoringOverlay
        problemId={params.id}
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
        padding: '14px 18px',
        borderRadius: '8px',
        background: 'var(--danger-subtle)',
        border: '1px solid var(--danger-border)'
      }}>
        <h4 style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '4px' }}>
          Execution Error
        </h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{result.error}</p>
      </div>
    );
  }

  const sub = result.submission;
  const ai = result.aiEvaluation;
  const breakdown = result.pointsBreakdown;
  const isAccepted = sub?.status === 'accepted';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Status banner */}
      <div style={{
        padding: '16px',
        borderRadius: '8px',
        background: isAccepted ? 'var(--success-subtle)' : 'var(--warning-subtle)',
        border: `1px solid ${isAccepted ? 'var(--success-border)' : 'var(--warning-border)'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{
            color: isAccepted ? 'var(--easy)' : 'var(--warning)',
            fontWeight: 700,
            fontSize: '1rem'
          }}>
            {isAccepted ? '✓ Status: Accepted' : `⚠ Status: ${sub?.status?.replace(/_/g, ' ').toUpperCase()}`}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
            Passed: {sub?.testCasesPassed}/{sub?.totalTestCases} Test Cases
            {sub?.executionTime > 0 && <span style={{ marginLeft: '8px' }}>• Execution Time: {sub.executionTime}ms</span>}
            {sub?.proctorFlagged && <span style={{ marginLeft: '8px', color: 'var(--hard)' }}>• Flagged: {sub.proctorViolations} violation(s)</span>}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
            +{result.pointsEarned} pts
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Credits Awarded</div>
        </div>
      </div>

      {/* Test Case Execution Output */}
      {result.judgeResults && result.judgeResults.length > 0 && (
        <div className="panel-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Test Cases Output & Diagnostic ({result.judgeResults.filter(r => r.passed).length}/{result.judgeResults.length} Passed)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.judgeResults.map((tc, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${tc.passed ? 'var(--success-border)' : 'var(--danger-border)'}`,
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: tc.passed ? 'var(--easy)' : 'var(--hard)' }}>
                    Test Case #{idx + 1}: {tc.status}
                  </span>
                  {tc.time && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{tc.time}s</span>}
                </div>
                {tc.input && (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                    <strong>Input:</strong> {tc.input}
                  </div>
                )}
                <div style={{ fontFamily: 'JetBrains Mono, monospace', color: tc.passed ? 'var(--easy)' : 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>
                  <strong>Your Output:</strong> {tc.actualOutput || (tc.passed ? '[correct]' : '[no output]')}
                </div>
                {tc.error && (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--hard)', fontSize: '0.72rem', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                    <strong>Error / Stderr:</strong> {tc.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Code Evaluation Diagnostic */}
      {ai && (
        <div className="panel-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Google Gemini Diagnostic Breakdown
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: ai.score >= 70 ? 'var(--easy)' : ai.score >= 40 ? 'var(--warning)' : 'var(--hard)' }}>
                {ai.score}/100
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>Overall Quality</div>
            </div>

            <div style={{ textAlign: 'center', padding: '10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                {ai.timeComplexity}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>Time Complexity</div>
              {ai.complexityComparison?.time && (
                <div style={{ fontSize: '0.65rem', marginTop: '2px', color: ai.complexityComparison.time.isOptimal ? 'var(--easy)' : 'var(--warning)', fontWeight: 600 }}>
                  {ai.complexityComparison.time.isOptimal ? 'Optimal' : 'Suboptimal'}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', padding: '10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                {ai.spaceComplexity}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>Space Complexity</div>
              {ai.complexityComparison?.space && (
                <div style={{ fontSize: '0.65rem', marginTop: '2px', color: ai.complexityComparison.space.isOptimal ? 'var(--easy)' : 'var(--warning)', fontWeight: 600 }}>
                  {ai.complexityComparison.space.isOptimal ? 'Optimal' : 'Suboptimal'}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <QualityBar label="Code Quality Score" value={ai.codeQuality} />
            <QualityBar label="Algorithmic Efficiency" value={ai.efficiency} />
          </div>

          {ai.suggestions && (
            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong>Optimization Recommendation:</strong> {ai.suggestions}
            </div>
          )}

          {ai.strengths && (
            <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '6px', background: 'var(--success-subtle)', border: '1px solid var(--success-border)', fontSize: '0.8rem', color: 'var(--easy)', lineHeight: 1.5 }}>
              <strong>Strengths Identified:</strong> {ai.strengths}
            </div>
          )}
        </div>
      )}

      {breakdown && (
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-muted)'
        }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Ledger Valuation Formula:</strong>
          <br />
          {breakdown.formula}
        </div>
      )}
    </div>
  );
}

function QualityBar({ label, value }) {
  const color = value >= 70 ? 'var(--easy)' : value >= 40 ? 'var(--warning)' : 'var(--hard)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{value}/100</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: color,
          borderRadius: '3px',
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
}
