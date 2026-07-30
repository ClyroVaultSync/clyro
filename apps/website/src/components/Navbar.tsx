'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand-logo">
          <div className="brand-icon">🔑</div>
          <span>Clyro</span>
        </Link>

        <nav className="nav-links">
          {!isLoading && isAuthenticated ? (
            <>
              <Link
                href="/vault"
                className={`nav-link ${pathname === '/vault' ? 'active' : ''}`}
              >
                Vault Shell
              </Link>
              <Link
                href="/devices"
                className={`nav-link ${pathname === '/devices' ? 'active' : ''}`}
              >
                Devices
              </Link>
              <Link
                href="/sessions"
                className={`nav-link ${pathname === '/sessions' ? 'active' : ''}`}
              >
                Sessions
              </Link>
              <Link
                href="/account"
                className={`nav-link ${pathname === '/account' ? 'active' : ''}`}
              >
                Account
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Sign Out
              </button>
            </>
          ) : !isLoading ? (
            <>
              <Link
                href="/login"
                className={`nav-link ${pathname === '/login' ? 'active' : ''}`}
              >
                Sign In
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
};
