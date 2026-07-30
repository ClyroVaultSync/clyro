'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, ActiveSession } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

export default function SessionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logoutAll } = useAuth();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.sessions.list();
    setLoading(false);

    if (res.success && res.data) {
      setSessions(res.data.sessions || []);
    } else {
      setError(res.error?.message || 'Failed to load active sessions.');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated, authLoading, router, fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this active session?')) return;

    setRevokingId(sessionId);
    setActionMessage(null);
    setError(null);

    const res = await api.sessions.revoke(sessionId);
    setRevokingId(null);

    if (res.success) {
      setActionMessage('Session terminated successfully.');
      fetchSessions();
    } else {
      setError(res.error?.message || 'Failed to terminate session.');
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('This will terminate ALL active sessions across all your devices. Continue?')) return;

    setLoggingOutAll(true);
    await logoutAll();
    router.push('/login');
  };

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading active sessions...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Active Sessions</h1>
          <p className="page-subtitle">
            Review and terminate authenticated sessions across your devices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchSessions} className="btn btn-secondary btn-sm">
            Refresh
          </button>
          <button
            onClick={handleLogoutAll}
            className="btn btn-danger btn-sm"
            disabled={loggingOutAll}
          >
            {loggingOutAll ? <span className="spinner" /> : 'Log Out All Devices'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {actionMessage && (
        <div className="alert alert-success">
          <span>✅</span>
          <div>{actionMessage}</div>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🛡️</div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Active Sessions Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Sign in to start a new authenticated session.
          </p>
        </div>
      ) : (
        <div className="grid-cols-2">
          {sessions.map((sess) => (
            <div key={sess.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{sess.deviceName}</h3>
                  <span className="badge badge-success">Active</span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Session ID:</strong>{' '}
                    <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.775rem' }}>
                      {sess.id}
                    </code>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Created:</strong>{' '}
                    {new Date(sess.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Last Activity:</strong>{' '}
                    {new Date(sess.lastActivityAt).toLocaleString()}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Expires At:</strong>{' '}
                    {new Date(sess.expiresAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleRevokeSession(sess.id)}
                className="btn btn-danger btn-sm btn-full"
                disabled={revokingId === sess.id}
              >
                {revokingId === sess.id ? <span className="spinner" /> : 'Terminate Session'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
