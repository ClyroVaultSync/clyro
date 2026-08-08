'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    const res = await api.auth.requestPasswordReset(email);
    setLoading(false);

    if (res.success && res.data) {
      setSuccess(res.data.message);
    } else {
      setError(res.error?.message || 'Failed to send reset link.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword) return;

    setLoading(true);
    setError(null);
    const res = await api.auth.resetPassword({ token, newPassword });
    setLoading(false);

    if (res.success) {
      setSuccess('Password reset successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      setError(res.error?.message || 'Password reset failed. Invalid or expired token.');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 className="page-title" style={{ fontSize: '1.6rem' }}>Reset Password</h2>
          <p className="page-subtitle">Recover your Clyro account authentication access</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>✅</span>
            <div>{success}</div>
          </div>
        )}

        {tokenParam || token ? (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="token">Reset Token</label>
              <input
                id="token"
                type="text"
                className="form-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">New Master Password</label>
              <input
                id="newPassword"
                type="password"
                className="form-input"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Set New Password'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestLink}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Account Email Address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Remembered your password?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}><span className="spinner" style={{ width: '24px', height: '24px' }}></span></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
