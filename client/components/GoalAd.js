'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { adsAPI } from '@/lib/api';

/**
 * Goal-Based Advertisement component.
 * Fetches DB-backed ads matching the user's active goal category, rotates them
 * every 8s, tracks impressions/clicks, and supports the rewarded-watch flow
 * (watch a short countdown to earn bonus points).
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

  // Track an impression whenever the displayed ad changes
  useEffect(() => {
    const ad = ads[current];
    if (!ad || !ad.id) return;
    currentAdIdRef.current = ad.id;
    adsAPI.impression(ad.id).catch(() => {});
  }, [current, ads]);

  // Rotate ads every 8 seconds (paused while a rewarded watch is running)
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
      setRewardMsg(err.response?.data?.message || 'Reward unavailable right now.');
    }
  }, []);

  // Countdown → claim reward when the minimum watch time elapses
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
        setRewardMsg(res.data.message || `+${res.data.data?.points} points earned!`);
        setWatching(false);
      })
      .catch(err => {
        setRewardMsg(err.response?.data?.message || 'Reward claim failed.');
        setWatching(false);
      });
  }, [watching, countdown, ads, current]);

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
          onClick={(e) => handleClick(e, ad)}
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
        {ad.rewardPoints > 0 && (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--easy)',
            background: 'rgba(16, 185, 129, 0.12)',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            🎁 +{ad.rewardPoints} pts
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
          <a
            href={ad.url}
            onClick={(e) => handleClick(e, ad)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <button className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
              {ad.cta} →
            </button>
          </a>
          {ad.rewardPoints > 0 && (
            <button
              className="btn-secondary"
              disabled={watching}
              onClick={() => startReward(ad)}
              style={{
                padding: '8px 20px',
                fontSize: '0.82rem',
                whiteSpace: 'nowrap',
                background: watching ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--easy)',
                cursor: watching ? 'default' : 'pointer'
              }}
            >
              {watching ? `Watching… ${countdown}s` : `▶ Watch to earn +${ad.rewardPoints} pts`}
            </button>
          )}
        </div>
      </div>

      {rewardMsg && (
        <div style={{
          marginTop: '14px',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '0.85rem',
          background: rewardMsg.includes('points earned') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${rewardMsg.includes('points earned') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          color: rewardMsg.includes('points earned') ? 'var(--easy)' : 'var(--medium)'
        }}>
          {rewardMsg}
        </div>
      )}

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
