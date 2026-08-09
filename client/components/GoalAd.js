'use client';
import { useState, useEffect } from 'react';
import { adsAPI } from '@/lib/api';

/**
 * Goal-Based Advertisement component.
 * Fetches ads matching the user's active goal category and rotates them every 8s.
 */
export default function GoalAd({ category = 'custom', compact = false }) {
  const [ads, setAds] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adsAPI.getByCategory(category)
      .then(res => setAds(res.data.data || []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, [category]);

  // Rotate ads every 8 seconds
  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % ads.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [ads]);

  if (loading) return null;
  if (ads.length === 0) return null;

  const ad = ads[current];

  if (compact) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '10px',
        background: 'rgba(108, 99, 255, 0.05)',
        border: '1px dashed rgba(108, 99, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '0.82rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sponsored
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>·</span>
          <strong style={{ color: 'var(--text-primary)' }}>{ad.title}</strong>
        </div>
        <a
          href={ad.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            background: 'var(--gradient-primary)',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.78rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          {ad.cta}
        </a>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
          padding: '3px 8px',
          borderRadius: '4px'
        }}>
          Sponsored
        </span>
        {ad.badge && (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--accent-primary)',
            background: 'rgba(108, 99, 255, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {ad.badge}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Related to your{' '}
          <span style={{ color: 'var(--accent-primary)' }}>
            {{
              laptop: '💻 laptop', course: '📚 course', travel: '✈️ travel',
              gadget: '📱 gadget', savings: '🏦 savings', custom: '🎯 goal'
            }[category] || 'goal'}
          </span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {ad.title}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {ad.description}
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            by {ad.sponsor}
          </div>
        </div>

        <a
          href={ad.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <button className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
            {ad.cta} →
          </button>
        </a>
      </div>

      {/* Pagination dots */}
      {ads.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '14px', justifyContent: 'center' }}>
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: i === current ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                transition: 'background 0.2s ease',
                padding: 0
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
