'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { proctorAPI } from '@/lib/api';

/**
 * ProctoringOverlay - Monitors user activity during problem solving to prevent cheating
 * - Detects tab switches / window blur
 * - Detects copy/paste operations & context menu
 * - Tracks time spent away
 * - Authoritative server-side violation logging
 */
export default function ProctoringOverlay({ problemId, onViolation, enabled = true }) {
  const [violations, setViolations] = useState([]);
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [awayTime, setAwayTime] = useState(0);
  const [isAway, setIsAway] = useState(false);
  const [proctorActive, setProctorActive] = useState(false);

  const violationsRef = useRef([]);
  const awayStartRef = useRef(null);
  const awayTimerRef = useRef(null);
  const lastActivityRef = useRef(null);
  const sessionIdRef = useRef(null);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        proctorAPI.end(sessionIdRef.current).catch(() => {});
      }
    };
  }, []);

  const startProctoring = () => {
    setProctorActive(true);
    setViolations([]);
    violationsRef.current = [];
    setAwayTime(0);
    setIsAway(false);
    awayStartRef.current = null;

    proctorAPI.start(problemId)
      .then(res => {
        sessionIdRef.current = res.data?.data?.session?._id || null;
      })
      .catch(() => {
        sessionIdRef.current = null;
      });
  };

  const addViolation = useCallback((type, message) => {
    const violation = {
      type,
      message,
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString()
    };
    violationsRef.current = [...violationsRef.current, violation];
    setViolations(violationsRef.current);

    setWarningMessage(message);
    setWarningVisible(true);
    setTimeout(() => setWarningVisible(false), 4000);

    if (onViolation) {
      onViolation(violation, violationsRef.current.length);
    }

    if (sessionIdRef.current) {
      proctorAPI.violation(sessionIdRef.current, type, message).catch(() => {});
    }
  }, [onViolation]);

  // Tab switch detection
  useEffect(() => {
    if (!proctorActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsAway(true);
        awayStartRef.current = Date.now();
        addViolation('tab_switch', 'Focus Lost: Tab switch detected and recorded.');

        awayTimerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - awayStartRef.current) / 1000);
          setAwayTime(elapsed);
        }, 1000);
      } else {
        if (awayStartRef.current) {
          const elapsed = Math.floor((Date.now() - awayStartRef.current) / 1000);
          if (elapsed > 0) {
            addViolation('returned', `Focus Restored: Returned after ${elapsed}s away.`);
          }
        }
        setIsAway(false);
        awayStartRef.current = null;
        if (awayTimerRef.current) {
          clearInterval(awayTimerRef.current);
          awayTimerRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (awayTimerRef.current) clearInterval(awayTimerRef.current);
    };
  }, [proctorActive, addViolation]);

  // Window blur detection
  useEffect(() => {
    if (!proctorActive) return;

    const handleBlur = () => {
      if (!document.hidden) {
        addViolation('window_blur', 'Window Focus Lost: Pointer exited browser viewport.');
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [proctorActive, addViolation]);

  // Clipboard & right-click guards
  useEffect(() => {
    if (!proctorActive) return;

    const handleCopy = (e) => {
      e.preventDefault();
      addViolation('copy', 'Clipboard Operation: Copying restricted during assessment.');
    };

    const handlePaste = (e) => {
      e.preventDefault();
      addViolation('paste', 'Clipboard Operation: Pasting restricted during assessment.');
    };

    const handleCut = (e) => {
      e.preventDefault();
      addViolation('cut', 'Clipboard Operation: Cutting restricted during assessment.');
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      addViolation('right_click', 'Input Guard: Context menu access restricted.');
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [proctorActive, addViolation]);

  // Shortcut key guards
  useEffect(() => {
    if (!proctorActive) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
        e.preventDefault();
        addViolation('shortcut', 'Keyboard Guard: Clipboard shortcuts restricted.');
      }
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        addViolation('alt_tab', 'Navigation Guard: Alt+Tab restricted.');
      }
      if (e.key === 'F12') {
        e.preventDefault();
        addViolation('devtools', 'Inspection Guard: Developer tools restricted.');
      }
      lastActivityRef.current = Date.now();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('click', handleActivity);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('click', handleActivity);
    };
  }, [proctorActive, addViolation]);

  if (!enabled) return null;

  // Initial agreement modal before starting problem
  if (!proctorActive) {
    return (
      <div className="modal-overlay" style={{ zIndex: 9999 }}>
        <div className="modal-content" style={{ maxWidth: '480px' }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
              Assessment Governance
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              Academic Integrity Environment
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              This challenge runs in an evaluated sandbox with automated integrity monitoring.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '14px 16px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>•</span>
              <span><strong>Tab Switches:</strong> Browser tab changes are logged to the assessment session.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>•</span>
              <span><strong>Clipboard Isolation:</strong> External copy and paste operations are blocked.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>•</span>
              <span><strong>Window Focus:</strong> Viewport exits and background blur events are tracked.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>•</span>
              <span><strong>Keyboard Guards:</strong> Inspection shortcuts and Alt+Tab are restricted.</span>
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '10px' }}
            onClick={startProctoring}
          >
            Acknowledge & Begin Proctored Session
          </button>
        </div>
      </div>
    );
  }

  // Active session status pill & warning toast
  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 9998,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'flex-end'
    }}>
      {/* Warning Toast */}
      {warningVisible && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '6px',
          background: 'var(--bg-card)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger)',
          fontSize: '0.8rem',
          fontWeight: 600,
          boxShadow: 'var(--shadow-card)',
          maxWidth: '340px'
        }}>
          ⚠ {warningMessage}
        </div>
      )}

      {/* Proctor status indicator */}
      <div style={{
        padding: '6px 14px',
        borderRadius: '20px',
        background: 'var(--bg-card)',
        border: `1px solid ${isAway ? 'var(--danger-border)' : 'var(--border-medium)'}`,
        color: isAway ? 'var(--danger)' : 'var(--text-primary)',
        fontSize: '0.72rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: isAway ? 'var(--danger)' : 'var(--easy)',
          display: 'inline-block'
        }} />
        <span>
          {isAway ? `Focus Lost (${awayTime}s)` : `Proctored Session • ${violations.length} Incident${violations.length !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  );
}