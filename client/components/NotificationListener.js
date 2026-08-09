'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/lib/AuthContext';

export default function NotificationListener() {
  const { user } = useAuth();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!user) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
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

  return (
    <div
      className={`toast toast-${notification.type}`}
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}
    >
      <span style={{ fontSize: '1.4rem' }}>{notification.type === 'success' ? '🎉' : '⚠️'}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Real-time Notification</div>
        <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>{notification.message}</div>
      </div>
      <button
        onClick={() => setNotification(null)}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '1rem',
          cursor: 'pointer',
          marginLeft: 'auto'
        }}
      >
        ✕
      </button>
    </div>
  );
}
