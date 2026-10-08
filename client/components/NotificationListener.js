'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/lib/AuthContext';

export default function NotificationListener() {
  const { user } = useAuth();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!user) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined, {
      path: '/socket.io',
      withCredentials: true
    });

    socket.on('connect', () => {
      socket.emit('register_user', user.id);
    });

    socket.on('withdrawal_updated', (data) => {
      setNotification({
        type: data.status === 'approved' ? 'success' : 'error',
        message: data.message
      });

      // Auto-hide toast after 6 seconds
      setTimeout(() => setNotification(null), 6000);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  if (!notification) return null;

  const isSuccess = notification.type === 'success';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        padding: '12px 18px',
        borderRadius: '8px',
        background: 'var(--bg-card)',
        border: `1px solid ${isSuccess ? 'var(--success-border)' : 'var(--danger-border)'}`,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '380px'
      }}
    >
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: isSuccess ? 'var(--success-subtle)' : 'var(--danger-subtle)',
        color: isSuccess ? 'var(--easy)' : 'var(--danger)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        fontWeight: 700,
        flexShrink: 0
      }}>
        {isSuccess ? '✓' : '!'}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
          System Notification
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {notification.message}
        </div>
      </div>
      <button
        onClick={() => setNotification(null)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          cursor: 'pointer',
          marginLeft: 'auto',
          padding: '2px 4px'
        }}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
