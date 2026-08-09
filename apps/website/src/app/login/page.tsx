'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { PageTransition } from '../../components/motion/PageTransition';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      router.push('/vault');
    } else {
      setError(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-heading">Sign In to Clyro</h2>
            <p className="mt-2 text-sm text-body">Access your trusted devices & vault sync</p>
          </div>

          <Alert
            isVisible={!!error}
            title="Authentication Error"
            description={error || ''}
            variant="danger"
            className="mb-6"
            onClose={() => setError(null)}
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FormField id="email" label="Email Address">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>

            <FormField id="password" label="Master Password">
              <div className="relative flex flex-col gap-1.5 w-full">
                <div className="absolute right-0 -top-7 flex items-center">
                  <Link href="/reset-password" className="text-xs text-accent hover:underline">
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </FormField>

            <Button type="submit" variant="primary" className="mt-2 w-full" isLoading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-body">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-accent hover:underline">
              Create one
            </Link>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
