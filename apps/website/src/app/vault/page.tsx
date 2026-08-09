'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, VaultMetadata, VaultData } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { PageTransition } from '../../components/motion/PageTransition';
import { Icons } from '../../components/icons';

export default function VaultPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [vaultMetadata, setVaultMetadata] = useState<VaultMetadata | null>(null);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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
    setDeleteModalOpen(false);
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
      <div className="flex min-h-[50vh] items-center justify-center flex-col gap-4">
        <Spinner size="lg" />
        <p className="text-body">Loading encrypted vault metadata...</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="pb-12">
        <PageHeader 
          title="Vault Management Shell" 
          subtitle="Zero-knowledge encrypted synchronization state and version control."
        >
          <Button variant="secondary" size="sm" onClick={fetchVaultInfo}>
            <Icons.RefreshCw className="mr-2 h-4 w-4" /> Refresh Metadata
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
          isVisible={!!message}
          title="Success"
          description={message || ''}
          variant="success"
          className="mb-6"
          onClose={() => setMessage(null)}
        />

        <Alert
          isVisible={true}
          title="Zero-Knowledge Decoupling Notice"
          description="Live client-side decryption of credentials in this web portal will be activated when Track C ('packages/crypto') client libraries are linked. Currently showing server-side vault metadata & sync status."
          variant="warning"
          className="mb-6"
        />

        {!vaultMetadata ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center mt-6">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Icons.Lock className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-heading">No Encrypted Vault Initialized</h3>
            <p className="max-w-md text-sm text-body mb-6">
              You do not currently have an active encrypted vault on the server. Initialize an empty vault payload to enable synchronization.
            </p>
            <Button variant="primary" onClick={handleCreateVault} isLoading={actionLoading}>
              Initialize Encrypted Vault
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <h3 className="text-lg font-semibold text-heading mb-4">Vault Metadata</h3>
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-body flex items-center gap-2">
                    <Icons.GitCommit className="h-4 w-4" /> Vault Version
                  </span>
                  <Badge variant="success">v{vaultMetadata.vaultVersion}</Badge>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-body flex items-center gap-2">
                    <Icons.Clock className="h-4 w-4" /> Last Modified
                  </span>
                  <span className="font-medium text-heading">
                    {new Date(vaultMetadata.lastModified).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-body flex items-center gap-2">
                    <Icons.Shield className="h-4 w-4" /> Payload State
                  </span>
                  <span className="font-medium text-success">Encrypted (Opaque Blob)</span>
                </div>
                {vaultData && (
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-body flex items-center gap-2">
                      <Icons.Database className="h-4 w-4" /> Blob Size
                    </span>
                    <span className="font-medium text-heading">{vaultData.encryptedVault.length} bytes</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-heading mb-3">Vault Operations</h3>
                <p className="text-sm text-body mb-6">
                  Manage cloud vault storage. Note that deleting your vault permanently removes all stored data from the server.
                </p>
              </div>

              <Button
                variant="danger"
                className="w-full justify-start mt-auto"
                onClick={() => setDeleteModalOpen(true)}
                disabled={actionLoading}
                isLoading={actionLoading}
              >
                <Icons.Trash2 className="mr-2 h-4 w-4" /> Delete Encrypted Vault
              </Button>
            </Card>
          </div>
        )}

        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Encrypted Vault"
        >
          <p className="text-sm text-body mb-6">
            CAUTION: Deleting your vault permanently removes all stored encrypted data. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteVault} isLoading={actionLoading}>
              Delete Permanently
            </Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
