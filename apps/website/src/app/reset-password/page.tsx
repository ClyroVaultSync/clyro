'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { PageTransition } from '../../components/motion/PageTransition';
import { Spinner } from '../../components/ui/Spinner';

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
    <PageTransition>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-heading">Reset Password</h2>
            <p className="mt-2 text-sm text-body">Recover your Clyro account authentication access</p>
          </div>

          <Alert
            isVisible={!!error}
            title="Error"
            description={error || ''}
            variant="danger"
            className="mb-6"
            onClose={() => setError(null)}
          />

          <Alert
            isVisible={!!success}
            title="Success"
            description={success || ''}
            variant="success"
            className="mb-6"
          />

          {tokenParam || token ? (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
              <FormField id="token" label="Reset Token">
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </FormField>

              <FormField id="newPassword" label="New Master Password">
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </FormField>

              <Button type="submit" variant="primary" className="mt-2 w-full" isLoading={loading}>
                Set New Password
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRequestLink} className="flex flex-col gap-5">
              <FormField id="email" label="Account Email Address">
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </FormField>

              <Button type="submit" variant="primary" className="mt-2 w-full" isLoading={loading}>
                Send Reset Link
              </Button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-body">
            Remembered your password?{' '}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
