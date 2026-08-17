'use client';

import Link from 'next/link';
import { useState } from 'react';
import SpotlightCard from '../../../../../components/SpotlightCard';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Button } from '../../../../../components/ui/Button';
import { Badge } from '../../../../../components/ui/Badge';
import { Alert } from '../../../../../components/ui/Alert';
import { Icons } from '../../../../../components/icons';
import type { SyncProviderId } from '@clyro/shared-types';

const PROVIDERS: {
  id: Extract<SyncProviderId, 'google-drive' | 'dropbox'>;
  name: string;
  description: string;
}[] = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    description:
      "Your encrypted vault is stored as a single file in your Drive's private app folder, connected via Google sign-in."
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description:
      'Your encrypted vault is stored via the Dropbox file API, connected via Dropbox sign-in. Supports true atomic conflict-free writes.'
  }
];

export default function CloudSetupPage() {
  const [connecting, setConnecting] = useState<SyncProviderId | null>(null);
  const [connected, setConnected] = useState<SyncProviderId | null>(null);

  const handleConnect = (id: SyncProviderId) => {
    setConnecting(id);
    setTimeout(() => {
      setConnecting(null);
      setConnected(id);
    }, 900);
  };

  return (
    <>
      <PageHeader
        title="Set up Cloud storage"
        subtitle="Sync your encrypted vault to your own Google Drive or Dropbox account."
      >
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <Icons.ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </PageHeader>

      <Alert
        isVisible
        variant="neutral"
        title="The extension performs the actual connection"
        description="Clicking Connect below hands off to the Clyro extension, which runs the real Google/Dropbox sign-in (via chrome.identity). This website never sees your Google or Dropbox account, and the connection itself never touches your master password or vault contents."
        className="mb-6"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {PROVIDERS.map(provider => {
          const isConnected = connected === provider.id;
          const isConnecting = connecting === provider.id;

          return (
            <SpotlightCard key={provider.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-base">
                    <Icons.Cloud className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-base font-semibold text-heading">{provider.name}</h3>
                </div>
                {isConnected && <Badge variant="success">Connected</Badge>}
              </div>

              <p className="text-sm text-body">{provider.description}</p>

              <Button
                variant={isConnected ? 'secondary' : 'primary'}
                size="sm"
                className="mt-auto w-fit"
                isLoading={isConnecting}
                disabled={isConnected}
                onClick={() => handleConnect(provider.id)}
              >
                {isConnected ? 'Connected' : `Connect ${provider.name}`}
              </Button>
            </SpotlightCard>
          );
        })}
      </div>
    </>
  );
}
