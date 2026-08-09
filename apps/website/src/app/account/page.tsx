'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { PageTransition } from '../../components/motion/PageTransition';
import { Icons } from '../../components/icons';

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
    <PageTransition>
      <div className="pb-12">
        <PageHeader 
          title="Account Settings" 
          subtitle="Manage your account profile, security, and credentials." 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-heading mb-4">Profile Details</h3>
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="text-body flex items-center gap-2">
                  <Icons.User className="h-4 w-4" /> Auth Status
                </span>
                <Badge variant={isAuthenticated ? 'success' : 'warning'}>
                  {isAuthenticated ? 'Authenticated' : 'Guest'}
                </Badge>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="text-body flex items-center gap-2">
                  <Icons.CheckCircle2 className="h-4 w-4" /> Email Verification
                </span>
                <Badge variant="warning">Verification Pending</Badge>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-body flex items-center gap-2">
                  <Icons.Shield className="h-4 w-4" /> Security Standard
                </span>
                <span className="font-medium text-heading">Zero-Knowledge (Argon2id)</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-heading mb-4">Security & Recovery</h3>
            <p className="text-sm text-body mb-6">
              Request a password reset link or manage active authentication credentials.
            </p>

            <Alert
              isVisible={!!message}
              title="Success"
              description={message || ''}
              variant="success"
              className="mb-6"
              onClose={() => setMessage(null)}
            />

            <div className="flex flex-col gap-4">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={handleRequestReset}
                disabled={loading || resetEmailSent}
                isLoading={loading}
              >
                <Icons.RefreshCw className="mr-2 h-4 w-4" />
                {resetEmailSent ? 'Reset Link Sent' : 'Request Password Reset'}
              </Button>

              <Link href="/sessions" className="w-full">
                <Button variant="secondary" className="w-full justify-start">
                  <Icons.MonitorSmartphone className="mr-2 h-4 w-4" /> View Active Sessions
                </Button>
              </Link>

              {isAuthenticated && (
                <Button variant="danger" className="w-full justify-start mt-2" onClick={logout}>
                  <Icons.LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
