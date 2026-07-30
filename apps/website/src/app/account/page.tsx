'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';

export default function AccountPage() {
  const { isAuthenticated, logout } = useAuth();
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRequestReset = async () => {
    setLoading(true);
    setMessage(null);
    const res = await api.auth.requestPasswordReset('user@example.com');
    setLoading(false);
    setResetEmailSent(true);
    if (res.success && res.data) {
      setMessage(res.data.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Account Settings</h1>
        <p className="page-subtitle">Manage your account profile, security, and credentials.</p>
      </div>

      <div className="grid-cols-2">
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px' }}>Profile Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Auth Status</span>
              <span className={`badge ${isAuthenticated ? 'badge-success' : 'badge-warning'}`}>
                {isAuthenticated ? 'Authenticated' : 'Guest'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email Verification</span>
              <span className="badge badge-warning">Verification Pending</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Security Standard</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Zero-Knowledge (Argon2id + XChaCha20)</span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px' }}>Security & Recovery</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Request a password reset link or manage active authentication credentials.
          </p>

          {message && (
            <div className="alert alert-success" style={{ marginBottom: '16px' }}>
              <span>✅</span>
              <div>{message}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleRequestReset}
              className="btn btn-secondary btn-full"
              disabled={loading || resetEmailSent}
            >
              {loading ? <span className="spinner" /> : resetEmailSent ? 'Reset Link Sent' : 'Request Password Reset'}
            </button>

            <Link href="/sessions" className="btn btn-secondary btn-full" style={{ textAlign: 'center' }}>
              View Active Sessions
            </Link>

            {isAuthenticated && (
              <button onClick={logout} className="btn btn-danger btn-full">
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
