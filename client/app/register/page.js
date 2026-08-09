'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
      <div className="bg-glow-orb" style={{ top: '10%', right: '20%', background: 'var(--accent-tertiary)' }} />

      <div className="glass-card animate-fade-in-up" style={{
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '2.5rem' }}>🎯</span>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            marginTop: '12px',
            letterSpacing: '-0.02em'
          }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            Start your coding reward journey
          </p>
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
              Full Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Confirm Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '8px', width: '100%', padding: '14px' }}
          >
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
