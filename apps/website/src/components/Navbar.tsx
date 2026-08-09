'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navLinks = isAuthenticated
    ? [
        { href: '/vault', label: 'Vault Shell' },
        { href: '/devices', label: 'Devices' },
        { href: '/sessions', label: 'Sessions' },
        { href: '/account', label: 'Account' },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-base">
      <div className="app-container flex h-16 items-center justify-between py-0 !min-h-0">
        <Link href="/" className="flex items-center gap-2 font-semibold text-heading transition-opacity hover:opacity-80">
          <Icons.Key className="h-5 w-5 text-accent" />
          <span>Clyro</span>
        </Link>

        <nav className="flex items-center gap-6">
          {!isLoading && isAuthenticated ? (
            <>
              <div className="flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'relative px-3 py-1.5 text-sm font-medium transition-colors hover:text-heading',
                        isActive ? 'text-heading' : 'text-body'
                      )}
                    >
                      {link.label}
                      {isActive && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute inset-0 z-[-1] rounded-md bg-raised"
                          transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
              <div className="h-5 w-px bg-border mx-2" />
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </>
          ) : !isLoading ? (
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-heading',
                  pathname === '/login' ? 'text-heading' : 'text-body'
                )}
              >
                Sign In
              </Link>
              <Button variant="primary" size="sm" onClick={() => router.push('/register')}>
                Get Started
              </Button>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
};
