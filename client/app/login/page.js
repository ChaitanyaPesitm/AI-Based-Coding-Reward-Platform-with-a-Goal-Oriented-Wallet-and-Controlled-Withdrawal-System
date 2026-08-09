'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      if (userData?.isAdmin) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);
    try {
      const userData = await login(demoEmail, demoPassword);
      if (userData?.isAdmin) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-grid" style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      <div className="bg-glow-orb" style={{ top: '10%', left: '20%', background: 'var(--accent-primary)' }} />

      <div className="glass-card animate-fade-in-up" style={{
        padding: '40px',
        width: '100%',
        maxWidth: '440px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span style={{ fontSize: '2.5rem' }}>🏆</span>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            marginTop: '12px',
            letterSpacing: '-0.02em'
          }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            Login to continue earning rewards
          </p>
        </div>

        {/* Quick Demo Login Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => handleQuickLogin('student@example.com', 'Student@Code2026!')}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid var(--border-medium)',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#60a5fa',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🎓 Demo Student
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@coderward.com', 'Admin@Code2026!')}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid var(--border-medium)',
              background: 'rgba(168, 85, 247, 0.1)',
              color: '#c084fc',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            ⚙️ Demo Admin
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '0 0 20px',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>or enter details</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Email
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '8px', width: '100%', padding: '14px' }}
          >
            {loading ? 'Logging in...' : 'Login →'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
