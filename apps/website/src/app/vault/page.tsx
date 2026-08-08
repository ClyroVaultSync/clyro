'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, VaultMetadata, VaultData } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

export default function VaultPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [vaultMetadata, setVaultMetadata] = useState<VaultMetadata | null>(null);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchVaultInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    const metaRes = await api.vault.getMetadata();

    if (metaRes.success && metaRes.data) {
      setVaultMetadata(metaRes.data);
      const fullRes = await api.vault.get();
      if (fullRes.success && fullRes.data) {
        setVaultData(fullRes.data);
      }
    } else if (metaRes.error?.code === 'NOT_FOUND') {
      setVaultMetadata(null);
      setVaultData(null);
    } else {
      setError(metaRes.error?.message || 'Failed to fetch vault synchronization metadata.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchVaultInfo();
    }
  }, [isAuthenticated, authLoading, router, fetchVaultInfo]);

  const handleCreateVault = async () => {
    setActionLoading(true);
    setError(null);
    setMessage(null);

    const initialBlob = btoa(JSON.stringify({ createdBy: 'Clyro Website', initializedAt: new Date().toISOString() }));
    const res = await api.vault.create({
      encryptedVault: initialBlob,
      vaultVersion: 1
    });

    setActionLoading(false);
    if (res.success) {
      setMessage('Initial encrypted vault created successfully!');
      fetchVaultInfo();
    } else {
      setError(res.error?.message || 'Failed to create vault.');
    }
  };

  const handleDeleteVault = async () => {
    if (!confirm('CAUTION: Deleting your vault permanently removes all stored encrypted data. This cannot be undone. Continue?')) return;

    setActionLoading(true);
    setError(null);
    setMessage(null);

    const res = await api.vault.delete();
    setActionLoading(false);

    if (res.success) {
      setMessage('Vault deleted permanently.');
      setVaultMetadata(null);
      setVaultData(null);
    } else {
      setError(res.error?.message || 'Failed to delete vault.');
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading encrypted vault metadata...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Vault Management Shell</h1>
          <p className="page-subtitle">
            Zero-knowledge encrypted synchronization state and version control.
          </p>
        </div>
        <button onClick={fetchVaultInfo} className="btn btn-secondary btn-sm">
          Refresh Metadata
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {message && (
        <div className="alert alert-success">
          <span>✅</span>
          <div>{message}</div>
        </div>
      )}

      <div className="alert alert-warning" style={{ background: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#c7d2fe' }}>
        <span>ℹ️</span>
        <div>
          <strong>Zero-Knowledge Decoupling Notice:</strong> Live client-side decryption of credentials in this web portal will be activated when Track C (&apos;packages/crypto&apos;) client libraries are linked. Currently showing server-side vault metadata & sync status.
        </div>
      </div>

      {!vaultMetadata ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', marginTop: '24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔐</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No Encrypted Vault Initialized</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 24px' }}>
            You do not currently have an active encrypted vault on the server. Initialize an empty vault payload to enable synchronization.
          </p>
          <button onClick={handleCreateVault} className="btn btn-primary" disabled={actionLoading}>
            {actionLoading ? <span className="spinner" /> : 'Initialize Encrypted Vault'}
          </button>
        </div>
      ) : (
        <div className="grid-cols-2" style={{ marginTop: '24px' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px' }}>Vault Metadata</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vault Version</span>
                <span className="badge badge-success">v{vaultMetadata.vaultVersion}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Modified</span>
                <span style={{ color: 'var(--text-main)' }}>
                  {new Date(vaultMetadata.lastModified).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payload State</span>
                <span style={{ color: 'var(--success)' }}>Encrypted (Opaque Blob)</span>
              </div>
              {vaultData && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Blob Size</span>
                  <span style={{ color: 'var(--text-main)' }}>{vaultData.encryptedVault.length} bytes</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '12px' }}>Vault Operations</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Manage cloud vault storage. Note that deleting your vault permanently removes all stored data from the server.
              </p>
            </div>

            <button onClick={handleDeleteVault} className="btn btn-danger btn-full" disabled={actionLoading}>
              {actionLoading ? <span className="spinner" /> : 'Delete Encrypted Vault'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
