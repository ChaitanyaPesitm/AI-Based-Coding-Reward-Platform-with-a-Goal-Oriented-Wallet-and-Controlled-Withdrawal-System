'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  const features = [
    {
      title: 'AI Code Evaluation',
      desc: 'Google Gemini analyzes code for algorithmic time complexity, space efficiency, and style, generating structured feedback and scoring.',
      tag: 'Analysis Engine'
    },
    {
      title: 'Goal-Oriented Wallet',
      desc: 'Define verifiable academic and financial targets (hardware, certifications, exam fees). Points accumulate deterministically.',
      tag: 'Financial Ledger'
    },
    {
      title: 'Controlled Withdrawal System',
      desc: 'Enforces payout only upon reaching 100% goal achievement. Features rule-based fraud detection and admin approval workflows.',
      tag: 'Security & Integrity'
    },
    {
      title: 'Multi-Language Execution Sandbox',
      desc: 'Execute C, Python, and Java code against isolated test suites powered by the Wandbox runtime environment.',
      tag: 'Isolated Sandbox'
    },
    {
      title: 'Anti-Plagiarism & Proctoring',
      desc: 'Monitors tab switches, window blur events, and unauthorized clipboard operations with authoritative server-side violation logging.',
      tag: 'Assessment Integrity'
    },
    {
      title: 'Deterministic Reward Ledger',
      desc: 'Transparent scoring model: Base Points × Test Pass Ratio × AI Quality Multiplier × Difficulty Weight.',
      tag: 'Reward Formula'
    }
  ];

  const workflow = [
    {
      step: '01',
      title: 'Define Financial Goal',
      desc: 'Select a structured goal category (e.g., Development Laptop, Certification, Exam Fees) with a minimum 10,000-point threshold.'
    },
    {
      step: '02',
      title: 'Complete Coding Challenges',
      desc: 'Solve algorithmic challenges across C, Python, and Java inside the integrated Monaco IDE under proctored conditions.'
    },
    {
      step: '03',
      title: 'Automated Evaluation',
      desc: 'The runtime runs code against hidden test vectors while Gemini AI evaluates time complexity, space usage, and code quality.'
    },
    {
      step: '04',
      title: 'Verification & Payout',
      desc: 'Upon reaching 100% goal completion, users submit withdrawal requests (UPI) subject to automated fraud screening and administrator audit.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Institutional Top Bar */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '8px 24px',
        textAlign: 'center',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        fontWeight: 500
      }}>
        Visvesvaraya Technological University (VTU) Final Year Project • PESITM Shivamogga, Dept. of Computer Science & Engineering
      </div>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1060px',
        margin: '0 auto',
        padding: '72px 24px 56px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          borderRadius: '6px',
          background: 'var(--primary-subtle)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--primary)',
          marginBottom: '24px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Automated Assessment & Controlled Micro-Incentive Platform
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 4vw, 3.2rem)',
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: '20px',
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)'
        }}>
          AI-Evaluated Coding Platform with
          <br />
          <span style={{ color: 'var(--primary)' }}>Goal-Oriented Financial Incentives</span>
        </h1>

        <p style={{
          fontSize: '1.05rem',
          color: 'var(--text-secondary)',
          maxWidth: '680px',
          margin: '0 auto 36px',
          lineHeight: 1.6
        }}>
          Transform programming practice into verified milestones. Solve challenges in C, Python, and Java,
          evaluated by automated test suites and Google Gemini AI, with payouts unlocked upon goal completion.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '11px 28px', fontSize: '0.9rem' }}>
              Create Account
            </button>
          </Link>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ padding: '11px 28px', fontSize: '0.9rem' }}>
              Sign In to Platform
            </button>
          </Link>
        </div>

        {/* Platform Telemetry Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginTop: '56px',
          textAlign: 'left'
        }}>
          <div className="panel-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Runtimes</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>C • Python • Java</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Wandbox isolated sandboxes</div>
          </div>
          <div className="panel-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Conversion</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--easy)', marginTop: '4px' }}>100 Points = ₹10</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Controlled UPI redemption</div>
          </div>
          <div className="panel-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Quality Engine</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>Google Gemini AI</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>O(N) complexity & style analysis</div>
          </div>
        </div>
      </section>

      {/* Architecture & Capabilities Grid */}
      <section style={{
        maxWidth: '1060px',
        margin: '0 auto',
        padding: '32px 24px 64px'
      }}>
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '40px', marginBottom: '32px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            System Architecture
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            Platform Modules & Security Controls
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '16px'
        }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="panel-card"
              style={{
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{
                  display: 'inline-block',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--primary)',
                  marginBottom: '8px'
                }}>
                  {f.tag}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chronological Workflow / Execution Pipeline */}
      <section style={{
        maxWidth: '1060px',
        margin: '0 auto',
        padding: '0 24px 64px'
      }}>
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '40px', marginBottom: '32px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Operational Pipeline
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            Execution & Settlement Lifecycle
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px'
        }}>
          {workflow.map((item, i) => (
            <div
              key={i}
              className="panel-card"
              style={{
                padding: '20px',
                borderLeft: '3px solid var(--primary)'
              }}
            >
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--primary)',
                fontFamily: 'JetBrains Mono, monospace',
                marginBottom: '8px'
              }}>
                STAGE {item.step}
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Access Gate Card */}
      <section style={{
        maxWidth: '1060px',
        margin: '0 auto',
        padding: '0 24px 64px'
      }}>
        <div className="panel-card" style={{
          padding: '36px 32px',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Ready to Begin Assessment?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Access the coding problem directory or review your goal wallet.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>
                Sign In
              </button>
            </Link>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>
                Register Account
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Clinical Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-medium)',
        background: 'var(--bg-secondary)',
        padding: '24px 20px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.78rem'
      }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            © 2025–2026 CodeReward Platform. All rights reserved.
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            PESITM Shivamogga — Project Team: Anish M, Deeksha J R, Dhruva Patel H, Gorakati Chaitanya Reddy
          </div>
        </div>
      </footer>
    </div>
  );
}
