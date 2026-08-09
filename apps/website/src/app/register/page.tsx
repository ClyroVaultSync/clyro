'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { PageTransition } from '../../components/motion/PageTransition';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await api.auth.register({
      email,
      password,
      ...(phone ? { phone } : {})
    });

    setLoading(false);

    if (res.success) {
      setSuccessMessage('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      setError(res.error?.message || 'Registration failed. Please check your inputs.');
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-heading">Create Your Vault Account</h2>
            <p className="mt-2 text-sm text-body">Zero-knowledge end-to-end encrypted storage</p>
          </div>

          <Alert
            isVisible={!!error}
            title="Registration Error"
            description={error || ''}
            variant="danger"
            className="mb-6"
            onClose={() => setError(null)}
          />

          <Alert
            isVisible={!!successMessage}
            title="Success"
            description={successMessage || ''}
            variant="success"
            className="mb-6"
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

            <FormField id="phone" label="Phone Number (Optional)">
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>

            <FormField id="password" label="Master Password">
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormField>

            <FormField id="confirmPassword" label="Confirm Master Password">
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat master password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </FormField>

            <Button type="submit" variant="primary" className="mt-2 w-full" isLoading={loading}>
              Register Account
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-body">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
