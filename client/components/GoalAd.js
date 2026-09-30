'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { adsAPI } from '@/lib/api';

/**
 * Goal-Based Advertisement component.
 * Displays relevant partner notices matching the user's active goal category,
 * supports impressions/clicks, and rewarded verification for extra credits.
 */
export default function GoalAd({ category = 'custom', compact = false }) {
  const [ads, setAds] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [rewardMsg, setRewardMsg] = useState('');
  const viewIdRef = useRef(null);
  const currentAdIdRef = useRef(null);

  useEffect(() => {
    adsAPI.getByCategory(category)
      .then(res => {
        setAds(res.data.data || []);
        setCurrent(0);
      })
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, [category]);

  // Track impression on change
  useEffect(() => {
    const ad = ads[current];
    if (!ad || !ad.id) return;
    currentAdIdRef.current = ad.id;
    adsAPI.impression(ad.id).catch(() => {});
  }, [current, ads]);

  // Rotate every 8 seconds
  useEffect(() => {
    if (ads.length <= 1 || watching) return;
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % ads.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [ads, watching]);

  const handleClick = useCallback(async (e, ad) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await adsAPI.click(ad.id);
      const url = res.data.data?.url || ad.url;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      window.open(ad.url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const startReward = useCallback(async (ad) => {
    setRewardMsg('');
    try {
      const res = await adsAPI.viewStart(ad.id);
      const { viewId, requiredSeconds } = res.data.data;
      viewIdRef.current = viewId;
      setWatching(true);
      setCountdown(requiredSeconds);
    } catch (err) {
      setRewardMsg(err.response?.data?.message || 'Verification unavailable right now.');
    }
  }, []);

  useEffect(() => {
    if (!watching) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }

    const ad = ads[current];
    const viewId = viewIdRef.current;
    viewIdRef.current = null;
    if (!ad || !viewId) {
      const t = setTimeout(() => setWatching(false), 0);
      return () => clearTimeout(t);
    }
    adsAPI.reward(ad.id, viewId)
      .then(res => {
        setRewardMsg(res.data.message || `+${res.data.data?.points} points credited to wallet!`);
        setWatching(false);
      })
      .catch(err => {
        setRewardMsg(err.response?.data?.message || 'Credit verification failed.');
        setWatching(false);
      });
  }, [watching, countdown, ads, current]);

  if (loading) return null;
  if (ads.length === 0) return null;

  const ad = ads[current];

  if (compact) {
    return (
      <div style={{
        padding: '10px 14px',
        borderRadius: '6px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sponsored
          </span>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <strong style={{ color: 'var(--text-primary)' }}>{ad.title}</strong>
        </div>
        <a
          href={ad.url}
          onClick={(e) => handleClick(e, ad)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            {ad.cta}
          </button>
        </a>
      </div>
    );
  }

  return (
    <div className="panel-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          Sponsored Partner
        </span>
        {ad.badge && (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'var(--primary)',
            background: 'var(--primary-subtle)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {ad.badge}
          </span>
        )}
        {ad.rewardPoints > 0 && (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'var(--easy)',
            background: 'var(--success-subtle)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            +{ad.rewardPoints} bonus credits
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Target Category: <strong style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{category}</strong>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
            {ad.title}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {ad.description}
          </div>
          <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Offered by {ad.sponsor}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {ad.rewardPoints > 0 && (
            <button
              className="btn-secondary"
              disabled={watching}
              onClick={() => startReward(ad)}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap'
              }}
            >
              {watching ? `Reviewing (${countdown}s)` : `Verify for +${ad.rewardPoints} pts`}
            </button>
          )}
          <a
            href={ad.url}
            onClick={(e) => handleClick(e, ad)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
              {ad.cta} →
            </button>
          </a>
        </div>
      </div>

      {rewardMsg && (
        <div style={{
          marginTop: '10px',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          background: rewardMsg.includes('points') ? 'var(--success-subtle)' : 'var(--warning-subtle)',
          border: `1px solid ${rewardMsg.includes('points') ? 'var(--success-border)' : 'var(--warning-border)'}`,
          color: rewardMsg.includes('points') ? 'var(--easy)' : 'var(--warning)'
        }}>
          {rewardMsg}
        </div>
      )}

      {/* Pagination indicators */}
      {ads.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '10px', justifyContent: 'center' }}>
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
                background: i === current ? 'var(--primary)' : 'var(--border-strong)',
                padding: 0
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
