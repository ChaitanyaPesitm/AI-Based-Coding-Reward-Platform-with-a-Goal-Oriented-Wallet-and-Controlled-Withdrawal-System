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
    <div style={{
      minHeight: 'calc(100vh - 56px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-primary)'
    }}>
      <div className="panel-card" style={{
        padding: '36px',
        width: '100%',
        maxWidth: '420px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: '10px'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: 'var(--primary)',
            marginBottom: '4px'
          }}>
            Authentication Portal
          </div>
          <h1 style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)'
          }}>
            Sign In to CodeReward
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
            Enter your credentials to manage goals and solve problems.
          </p>
        </div>

        {/* Quick Demo Login Preset Buttons */}
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          borderRadius: '8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Quick Demo Access Presets
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('demo@codereward.com', 'demo123')}
              disabled={loading}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--success-border)',
                background: 'var(--success-subtle)',
                color: 'var(--easy)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>Demo Student (100% Goal Complete)</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>demo@codereward.com</div>
              </div>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--easy)', color: '#ffffff' }}>
                Ready to Withdraw →
              </span>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '2px' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('aarav@coderward.com', 'student123')}
                disabled={loading}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ color: 'var(--primary)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Student</div>
                <div style={{ fontSize: '0.75rem' }}>aarav@coderward.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@coderward.com', 'Admin@Code2026!')}
                disabled={loading}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ color: 'var(--warning)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Administrator</div>
                <div style={{ fontSize: '0.75rem' }}>admin@coderward.com</div>
              </button>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '0 0 18px',
          color: 'var(--text-muted)',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>or sign in with email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'var(--danger-subtle)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px', display: 'block' }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px', display: 'block' }}>
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
            style={{ marginTop: '6px', width: '100%', padding: '10px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)'
        }}>
          Need a student account?{' '}
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
