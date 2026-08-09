'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, TrustedDevice } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { PageTransition } from '../../components/motion/PageTransition';
import { StaggerList } from '../../components/motion/StaggerList';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Icons } from '../../components/icons';

export default function DevicesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

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
    setRevokeTarget(null);
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
      <div className="flex min-h-[50vh] items-center justify-center flex-col gap-4">
        <Spinner size="lg" />
        <p className="text-body">Loading trusted devices...</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="pb-12">
        <PageHeader 
          title="Trusted Devices" 
          subtitle="Manage devices authorized to synchronize and unlock your encrypted vault."
        >
          <Button variant="secondary" size="sm" onClick={fetchDevices}>
            <Icons.RefreshCw className="mr-2 h-4 w-4" /> Refresh List
          </Button>
        </PageHeader>

        <Alert
          isVisible={!!error}
          title="Error"
          description={error || ''}
          variant="danger"
          className="mb-6"
          onClose={() => setError(null)}
        />

        <Alert
          isVisible={!!actionMessage}
          title="Success"
          description={actionMessage || ''}
          variant="success"
          className="mb-6"
          onClose={() => setActionMessage(null)}
        />

        {devices.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Icons.Computer className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-heading">No Trusted Devices Found</h3>
            <p className="max-w-sm text-sm text-body">
              Log in from your browser extension or web portal to register a trusted device.
            </p>
          </Card>
        ) : (
          <StaggerList className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trusted Since</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((dev) => (
                  <TableRow key={dev.id} className="group">
                    <TableCell>
                      <div className="font-semibold text-heading">{dev.deviceName}</div>
                      <div className="text-xs text-body">
                        {dev.platform} • {dev.browser}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dev.isActive ? 'success' : 'danger'}>
                        {dev.isActive ? 'Active' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(dev.trustedSince).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(dev.lastSeenAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {dev.isActive && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRevokeTarget({ id: dev.id, name: dev.deviceName })}
                          disabled={revokingId === dev.id}
                          isLoading={revokingId === dev.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </StaggerList>
        )}

        <Modal
          isOpen={!!revokeTarget}
          onClose={() => setRevokeTarget(null)}
          title="Revoke Trusted Device"
        >
          <p className="text-sm text-body mb-6">
            Are you sure you want to revoke trusted device &quot;{revokeTarget?.name}&quot;? It will lose access to synchronize or unlock the vault.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => revokeTarget && handleRevoke(revokeTarget.id, revokeTarget.name)}
            >
              Revoke Device
            </Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
