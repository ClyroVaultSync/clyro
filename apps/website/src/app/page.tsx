'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '60px 0 40px' }}>
        <span className="badge badge-success" style={{ marginBottom: '16px' }}>
          Backend Complete • 18 Endpoints Live
        </span>
        <h1 className="page-title" style={{ fontSize: '3rem', lineHeight: '1.2' }}>
          Zero-Knowledge Password Management.
          <br />
          <span style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Zero Server Plaintext.
          </span>
        </h1>
        <p className="page-subtitle" style={{ maxWidth: '640px', margin: '16px auto 32px', fontSize: '1.1rem' }}>
          Clyro stores only encrypted vault payloads. Your master password, encryption keys, and credentials never touch our servers.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          {isAuthenticated ? (
            <>
              <Link href="/vault" className="btn btn-primary">
                Open Vault Shell
              </Link>
              <Link href="/devices" className="btn btn-secondary">
                Manage Devices
              </Link>
            </>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary">
                Create Free Account
              </Link>
              <Link href="/login" className="btn btn-secondary">
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid-cols-3" style={{ marginTop: '40px' }}>
        <div className="glass-card">
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔒</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '8px' }}>
            True Zero-Knowledge
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            All cryptographic operations occur on trusted client devices. Backend endpoints only store opaque encrypted blobs.
          </p>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💻</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '8px' }}>
            Trusted Device Sync
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Register, view, and revoke device authorization dynamically via `GET/DELETE /api/v1/devices`.
          </p>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🛡️</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '8px' }}>
            Session Control
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Monitor active sessions, perform single-session revocations, or trigger a global log out across all devices.
          </p>
        </div>
      </div>
    </div>
  );
}
