'use client';
import { useState, useEffect, useRef } from 'react';
import { proctorAPI } from '@/lib/api';

/**
 * ProctoringOverlay - Monitors user activity during problem solving to prevent cheating
 * - Detects tab switches / window blur (copying from other sites)
 * - Detects copy/paste operations
 * - Detects right-click
 * - Tracks time spent away
 * - Shows warnings and can flag submissions
 *
 * Every violation is reported to the server and stored on a ProctorSession, so the
 * submission route can read the authoritative count instead of trusting the client.
 */
export default function ProctoringOverlay({ problemId, onViolation, enabled = true }) {
    const [violations, setViolations] = useState([]);
    const [isProctored, setIsProctored] = useState(true);
    const [warningVisible, setWarningVisible] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [awayTime, setAwayTime] = useState(0);
    const [isAway, setIsAway] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [proctorActive, setProctorActive] = useState(false);

    const violationsRef = useRef([]);
    const awayStartRef = useRef(null);
    const awayTimerRef = useRef(null);
    const lastActivityRef = useRef(null);
    const proctorStartedRef = useRef(false);
    const sessionIdRef = useRef(null);

    // End the server-side session if the user leaves the page without submitting
    useEffect(() => {
        return () => {
            if (sessionIdRef.current) {
                proctorAPI.end(sessionIdRef.current).catch(() => {});
            }
        };
    }, []);

    // Start proctoring session
    const startProctoring = () => {
        setProctorActive(true);
        proctorStartedRef.current = true;
        setShowConfirm(false);
        setViolations([]);
        violationsRef.current = [];
        setAwayTime(0);
        setIsAway(false);
        awayStartRef.current = null;

        // Register a server-side session so violations are recorded server-side
        proctorAPI.start(problemId)
            .then(res => {
                sessionIdRef.current = res.data?.data?.session?._id || null;
            })
            .catch(() => {
                sessionIdRef.current = null;
            });
    };

    // Add a violation
    const addViolation = (type, message) => {
        const violation = {
            type,
            message,
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString()
        };
        violationsRef.current = [...violationsRef.current, violation];
        setViolations(violationsRef.current);

        // Show warning
        setWarningMessage(message);
        setWarningVisible(true);
        setTimeout(() => setWarningVisible(false), 4000);

        // Notify parent
        if (onViolation) {
            onViolation(violation, violationsRef.current.length);
        }

        // Record the violation server-side
        if (sessionIdRef.current) {
            proctorAPI.violation(sessionIdRef.current, type, message).catch(() => {});
        }
    };

    // Handle tab visibility change
    useEffect(() => {
        if (!proctorActive) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // User left the tab - potential cheating
                setIsAway(true);
                awayStartRef.current = Date.now();
                addViolation('tab_switch', '⚠️ You switched tabs! This is recorded as a potential cheating attempt.');

                // Start tracking away time
                awayTimerRef.current = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - awayStartRef.current) / 1000);
                    setAwayTime(elapsed);
                }, 1000);
            } else {
                // User returned
                if (awayStartRef.current) {
                    const elapsed = Math.floor((Date.now() - awayStartRef.current) / 1000);
                    if (elapsed > 0) {
                        addViolation('returned', `You returned after ${elapsed}s away.`);
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
    }, [proctorActive]);

    // Handle window blur (clicking outside browser)
    useEffect(() => {
        if (!proctorActive) return;

        const handleBlur = () => {
            if (!document.hidden) {
                addViolation('window_blur', '⚠️ You clicked outside the browser window!');
            }
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [proctorActive]);

    // Block copy/paste
    useEffect(() => {
        if (!proctorActive) return;

        const handleCopy = (e) => {
            e.preventDefault();
            addViolation('copy', '🚫 Copying is disabled during proctored sessions!');
        };

        const handlePaste = (e) => {
            e.preventDefault();
            addViolation('paste', '🚫 Pasting is disabled during proctored sessions!');
        };

        const handleCut = (e) => {
            e.preventDefault();
            addViolation('cut', '🚫 Cutting is disabled during proctored sessions!');
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            addViolation('right_click', '🚫 Right-click is disabled during proctored sessions!');
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
    }, [proctorActive]);

    // Track idle time (no keyboard/mouse activity)
    useEffect(() => {
        if (!proctorActive) return;

        const handleActivity = () => {
            lastActivityRef.current = Date.now();
        };

        const handleKeyDown = (e) => {
            // Block common shortcut keys that could be used for cheating
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
                e.preventDefault();
                addViolation('shortcut', '🚫 Keyboard shortcuts (Ctrl+C/V/X/A) are disabled!');
            }
            if (e.altKey && e.key === 'Tab') {
                e.preventDefault();
                addViolation('alt_tab', '🚫 Alt+Tab is disabled during proctored sessions!');
            }
            if (e.key === 'F12') {
                e.preventDefault();
                addViolation('devtools', '🚫 Developer tools are disabled during proctored sessions!');
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
    }, [proctorActive]);

    // Proctoring disabled globally by admin — render nothing
    if (!enabled) {
        return null;
    }

    // If not started, show confirmation dialog
    if (!proctorActive) {
        return (
            <div className="modal-overlay" style={{ zIndex: 9999 }}>
                <div className="modal-content" style={{ maxWidth: '500px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛡️</div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px' }}>
                        Proctored Session
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                        This problem is being solved in a <strong>proctored environment</strong> to ensure academic integrity.
                        <br /><br />
                        The following are monitored:
                    </p>
                    <div style={{ textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>🚫 <strong>Tab switching</strong> — leaving this tab is recorded</div>
                        <div>🚫 <strong>Copy/Paste</strong> — disabled during session</div>
                        <div>🚫 <strong>Right-click</strong> — disabled during session</div>
                        <div>🚫 <strong>Keyboard shortcuts</strong> — Ctrl+C/V/X/A, Alt+Tab, F12 blocked</div>
                        <div>📊 <strong>Idle time</strong> — extended inactivity is flagged</div>
                    </div>
                    <button
                        className="btn-primary"
                        style={{ width: '100%', padding: '12px' }}
                        onClick={startProctoring}
                    >
                        🛡️ I Understand — Start Proctored Session
                    </button>
                </div>
            </div>
        );
    }

    // Show proctoring status bar
    return (
        <>
            {/* Proctoring status bar */}
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
                {/* Warning toast */}
                {warningVisible && (
                    <div style={{
                        padding: '12px 20px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.95)',
                        color: 'white',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)',
                        animation: 'slideIn 0.3s ease',
                        maxWidth: '350px'
                    }}>
                        {warningMessage}
                    </div>
                )}

                {/* Proctor status pill */}
                <div style={{
                    padding: '8px 16px',
                    borderRadius: '30px',
                    background: isAway ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: isAway ? 'pulse 1s infinite' : 'none' }} />
                    {isAway ? `⚠ Away ${awayTime}s` : `🛡️ Proctored • ${violations.length} violation${violations.length !== 1 ? 's' : ''}`}
                </div>
            </div>

            <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
        </>
    );
}