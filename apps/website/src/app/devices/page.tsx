'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, TrustedDevice } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

export default function DevicesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.devices.list();
    setLoading(false);

    if (res.success && res.data) {
      setDevices(res.data.devices || []);
    } else {
      setError(res.error?.message || 'Failed to load trusted devices.');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchDevices();
    }
  }, [isAuthenticated, authLoading, router, fetchDevices]);

  const handleRevoke = async (deviceId: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke trusted device "${name}"?`)) return;

    setRevokingId(deviceId);
    setActionMessage(null);
    setError(null);

    const res = await api.devices.revoke(deviceId);
    setRevokingId(null);

    if (res.success) {
      setActionMessage(`Device "${name}" has been revoked.`);
      fetchDevices();
    } else {
      setError(res.error?.message || 'Failed to revoke device.');
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading trusted devices...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Trusted Devices</h1>
          <p className="page-subtitle">
            Manage devices authorized to synchronize and unlock your encrypted vault.
          </p>
        </div>
        <button onClick={fetchDevices} className="btn btn-secondary btn-sm">
          Refresh List
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {actionMessage && (
        <div className="alert alert-success">
          <span>✅</span>
          <div>{actionMessage}</div>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💻</div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Trusted Devices Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Log in from your browser extension or web portal to register a trusted device.
          </p>
        </div>
      ) : (
        <div className="grid-cols-2">
          {devices.map((dev) => (
            <div key={dev.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{dev.deviceName}</h3>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-dim)' }}>
                      {dev.platform} • {dev.browser}
                    </span>
                  </div>
                  <span className={`badge ${dev.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {dev.isActive ? 'Active' : 'Revoked'}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' }}>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Trusted Since:</strong>{' '}
                    {new Date(dev.trustedSince).toLocaleDateString()}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Last Activity:</strong>{' '}
                    {new Date(dev.lastSeenAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {dev.isActive && (
                <button
                  onClick={() => handleRevoke(dev.id, dev.deviceName)}
                  className="btn btn-danger btn-sm btn-full"
                  disabled={revokingId === dev.id}
                >
                  {revokingId === dev.id ? <span className="spinner" /> : 'Revoke Device Access'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
