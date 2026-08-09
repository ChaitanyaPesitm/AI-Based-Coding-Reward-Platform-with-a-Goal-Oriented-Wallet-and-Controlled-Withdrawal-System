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
      icon: '🤖',
      title: 'AI Code Evaluation',
      desc: 'Google Gemini AI analyzes your code for time complexity, efficiency, and quality — giving you a detailed performance score.'
    },
    {
      icon: '🎯',
      title: 'Goal-Oriented Wallet',
      desc: 'Set financial goals like buying a laptop or funding a course. Earn points by coding and track your progress in real-time.'
    },
    {
      icon: '🔒',
      title: 'Controlled Withdrawal',
      desc: 'Withdraw rewards only when you achieve 100% of your goal. Built-in fraud detection ensures fair play.'
    },
    {
      icon: '💻',
      title: 'Multi-Language IDE',
      desc: 'Write code in C, Python, or Java using an integrated Monaco Editor — the same engine powering VS Code.'
    },
    {
      icon: '⚡',
      title: 'Instant Execution',
      desc: 'Your code runs against hidden test cases via Wandbox API. Get instant results with detailed pass/fail breakdowns.'
    },
    {
      icon: '📈',
      title: 'Smart Rewards',
      desc: 'Points calculated using: Base Points × Test Pass Rate × AI Multiplier × Difficulty Level. Better code = more rewards!'
    }
  ];

  const howItWorks = [
    { step: '01', title: 'Set Your Goal', desc: 'Choose a financial goal — laptop, course fees, savings, or anything you want to achieve.' },
    { step: '02', title: 'Solve Problems', desc: 'Pick coding challenges in C, Python, or Java. Write your solution in the built-in editor.' },
    { step: '03', title: 'AI Evaluates', desc: 'Wandbox runs your code against test cases. Gemini AI scores your code quality and efficiency.' },
    { step: '04', title: 'Earn & Withdraw', desc: 'Points are credited to your wallet. Once your goal hits 100%, request a withdrawal!' }
  ];

  return (
    <div className="bg-grid" style={{ minHeight: '100vh' }}>
      {/* Background glow orbs */}
      <div className="bg-glow-orb" style={{ top: '-200px', right: '-200px', background: 'var(--accent-primary)' }} />
      <div className="bg-glow-orb" style={{ bottom: '-200px', left: '-200px', background: 'var(--accent-tertiary)' }} />

      {/* Hero Section */}
      <section style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '100px 24px 80px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="animate-fade-in-up" style={{ marginBottom: '24px' }}>
          <span style={{
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(108, 99, 255, 0.1)',
            border: '1px solid rgba(108, 99, 255, 0.2)',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-primary)',
            letterSpacing: '0.5px'
          }}>
            🚀 VTU 7th Semester Project — PESITM Shivamogga
          </span>
        </div>

        <h1 className="animate-fade-in-up delay-100" style={{
          fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: '20px',
          letterSpacing: '-0.03em'
        }}>
          Code. <span className="gradient-text">Earn.</span> Achieve
          <br />Your Financial Goals.
        </h1>

        <p className="animate-fade-in-up delay-200" style={{
          fontSize: '1.15rem',
          color: 'var(--text-secondary)',
          maxWidth: '640px',
          margin: '0 auto 40px',
          lineHeight: 1.7
        }}>
          An AI-powered platform that transforms your coding practice into real financial growth.
          Solve problems, earn reward points, and withdraw when you achieve your goals.
        </p>

        <div className="animate-fade-in-up delay-300" style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link href="/register">
            <button className="btn-primary" style={{ padding: '14px 36px', fontSize: '1rem' }}>
              Start Earning Now →
            </button>
          </Link>
          <Link href="/login">
            <button className="btn-secondary" style={{ padding: '14px 36px', fontSize: '1rem' }}>
              I have an account
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="animate-fade-in-up delay-400" style={{
          display: 'flex',
          gap: '48px',
          justifyContent: 'center',
          marginTop: '60px',
          flexWrap: 'wrap'
        }}>
          {[
            { value: 'C / Py / Java', label: 'Languages Supported' },
            { value: '100pts = ₹10', label: 'Conversion Rate' },
            { value: 'AI-Powered', label: 'Code Evaluation' }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }} className="gradient-text">{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '40px 24px 80px'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 800,
          marginBottom: '12px',
          letterSpacing: '-0.02em'
        }}>
          Why <span className="gradient-text">CodeReward</span>?
        </h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          marginBottom: '48px',
          maxWidth: '500px',
          margin: '0 auto 48px'
        }}>
          A unique platform combining EdTech, AI, Gamification, and Fintech.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="glass-card animate-fade-in-up"
              style={{
                padding: '28px',
                animationDelay: `${i * 100}ms`,
                opacity: 0
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 24px 80px'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 800,
          marginBottom: '48px'
        }}>
          How It <span className="gradient-text">Works</span>
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px'
        }}>
          {howItWorks.map((item, i) => (
            <div
              key={i}
              className="animate-fade-in-up"
              style={{
                textAlign: 'center',
                padding: '20px',
                animationDelay: `${i * 150}ms`,
                opacity: 0
              }}
            >
              <div style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                marginBottom: '12px',
                opacity: 0.15
              }} className="gradient-text">
                {item.step}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 24px 100px',
        textAlign: 'center'
      }}>
        <div className="glass-card" style={{
          padding: '60px 40px',
          background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(59, 130, 246, 0.05))'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>
            Ready to Turn Code into <span className="gradient-text">Rewards</span>?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px' }}>
            Join now. Set a goal. Start solving. Start earning.
          </p>
          <Link href="/register">
            <button className="btn-primary" style={{ padding: '14px 40px', fontSize: '1.05rem' }}>
              Create Free Account →
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.8rem'
      }}>
        <p>© 2025-2026 CodeReward — AI-Based Coding Reward Platform</p>
        <p style={{ marginTop: '4px' }}>VTU Project by Anish M, Deeksha J R, Dhruva Patel H, Gorakati Chaitanya Reddy | PESITM, Shivamogga</p>
      </footer>
    </div>
  );
}
