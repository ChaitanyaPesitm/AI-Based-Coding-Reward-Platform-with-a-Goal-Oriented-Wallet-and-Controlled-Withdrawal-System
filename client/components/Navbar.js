'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = user ? [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/problems', label: 'Problems', icon: '💻' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/wallet', label: 'Wallet', icon: '💰' },
    ...(user.isAdmin ? [{ href: '/admin', label: 'Admin', icon: '⚙️' }] : [])
  ] : [];

  const isActive = (href) => pathname === href;

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px'
      }}>
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '1.6rem' }}>🏆</span>
          <span style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            letterSpacing: '-0.02em'
          }} className="gradient-text">
            CodeReward
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }} className="desktop-nav">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: isActive(link.href) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: isActive(link.href) ? 'rgba(108, 99, 255, 0.1)' : 'transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ fontSize: '1rem' }}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme toggle */}
          <button
            suppressHydrationWarning
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark / light mode"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid var(--border-medium)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)'
              }} className="desktop-nav">
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'var(--gradient-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.name}</span>
              </div>
              <button
                onClick={logout}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-medium)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                Logout
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{
                  display: 'none',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
                className="mobile-toggle"
              >
                {mobileOpen ? '✕' : '☰'}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link href="/login">
                <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                  Login
                </button>
              </Link>
              <Link href="/register">
                <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                  Sign Up
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && user && (
        <div style={{
          padding: '12px 24px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                textDecoration: 'none',
                padding: '10px 16px',
                borderRadius: '10px',
                color: isActive(link.href) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: isActive(link.href) ? 'rgba(108, 99, 255, 0.1)' : 'transparent',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
