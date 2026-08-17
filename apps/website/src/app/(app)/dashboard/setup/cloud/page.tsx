'use client';

import Link from 'next/link';
import { useState } from 'react';
import SpotlightCard from '../../../../../components/SpotlightCard';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Button } from '../../../../../components/ui/Button';
import { Badge } from '../../../../../components/ui/Badge';
import { Alert } from '../../../../../components/ui/Alert';
import { Icons } from '../../../../../components/icons';
import { useExtensionStatus } from '../../../../../hooks/useExtensionStatus';
import { openVault } from '../../../../../lib/extension-bridge';
import { siteConfig } from '../../../../../lib/site-config';
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
  const { status, refresh } = useExtensionStatus();
  const [connecting, setConnecting] = useState<SyncProviderId | null>(null);
  const [handoffFailed, setHandoffFailed] = useState(false);

  // The real OAuth flow runs inside the extension (chrome.identity), so all this
  // page can do is open the extension and let it take over — there is no
  // website-side "connected" state to invent.
  const connected = status.installed ? status.provider : null;

  const handleConnect = async (id: SyncProviderId) => {
    setConnecting(id);
    setHandoffFailed(false);
    const opened = await openVault();
    setConnecting(null);
    if (opened) {
      void refresh();
    } else {
      setHandoffFailed(true);
    }
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

      <Alert
        isVisible={handoffFailed}
        variant="warning"
        title="The extension didn't respond"
        description="Clyro couldn't hand off to the extension. Install or enable the Clyro extension for Chrome, then try connecting again."
        onClose={() => setHandoffFailed(false)}
        className="mb-6"
      />

      {!status.installed && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-border bg-raised px-4 py-3">
          <p className="text-sm text-body">
            The Clyro extension isn’t installed yet — cloud storage is connected from inside it.
          </p>
          <a href={siteConfig.chromeWebStoreUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              <Icons.Download className="mr-2 h-4 w-4" />
              Install for Chrome
            </Button>
          </a>
        </div>
      )}

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
                onClick={() => void handleConnect(provider.id)}
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
