'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, ActiveSession } from '../../lib/api';
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

export default function SessionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logoutAll } = useAuth();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);
  const [logoutAllModalOpen, setLogoutAllModalOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.sessions.list();
    setLoading(false);

    if (res.success && res.data) {
      setSessions(res.data.sessions || []);
    } else {
      setError(res.error?.message || 'Failed to load active sessions.');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated, authLoading, router, fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokeSessionId(null);
    setRevokingId(sessionId);
    setActionMessage(null);
    setError(null);

    const res = await api.sessions.revoke(sessionId);
    setRevokingId(null);

    if (res.success) {
      setActionMessage('Session terminated successfully.');
      fetchSessions();
    } else {
      setError(res.error?.message || 'Failed to terminate session.');
    }
  };

  const handleLogoutAll = async () => {
    setLogoutAllModalOpen(false);
    setLoggingOutAll(true);
    await logoutAll();
    router.push('/login');
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center flex-col gap-4">
        <Spinner size="lg" />
        <p className="text-body">Loading active sessions...</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="pb-12">
        <PageHeader 
          title="Active Sessions" 
          subtitle="Review and terminate authenticated sessions across your devices."
        >
          <Button variant="secondary" size="sm" onClick={fetchSessions}>
            <Icons.RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setLogoutAllModalOpen(true)}
            disabled={loggingOutAll}
            isLoading={loggingOutAll}
          >
            Log Out All Devices
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

        {sessions.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Icons.Shield className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-heading">No Active Sessions Found</h3>
            <p className="max-w-sm text-sm text-body">
              Sign in to start a new authenticated session.
            </p>
          </Card>
        ) : (
          <StaggerList className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device / Session ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((sess) => (
                  <TableRow key={sess.id} className="group">
                    <TableCell>
                      <div className="font-semibold text-heading">{sess.deviceName}</div>
                      <code className="text-[10px] text-body bg-black/20 px-1 py-0.5 rounded uppercase font-mono tracking-wider">
                        {sess.id.split('-')[0]}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Active</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(sess.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(sess.lastActivityAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(sess.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setRevokeSessionId(sess.id)}
                        disabled={revokingId === sess.id}
                        isLoading={revokingId === sess.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      >
                        Terminate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </StaggerList>
        )}

        <Modal
          isOpen={!!revokeSessionId}
          onClose={() => setRevokeSessionId(null)}
          title="Terminate Session"
        >
          <p className="text-sm text-body mb-6">
            Are you sure you want to terminate this active session? The device will be signed out immediately.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setRevokeSessionId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => revokeSessionId && handleRevokeSession(revokeSessionId)}
            >
              Terminate Session
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={logoutAllModalOpen}
          onClose={() => setLogoutAllModalOpen(false)}
          title="Log Out All Devices"
        >
          <p className="text-sm text-body mb-6">
            This will terminate ALL active sessions across all your devices, including this one. Continue?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setLogoutAllModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleLogoutAll}>
              Log Out All
            </Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
