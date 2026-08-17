'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import localFont from 'next/font/local';
import { Space_Grotesk } from 'next/font/google';
import MagicBento from '../../../components/MagicBento';
import { PageHeader } from '../../../components/ui/PageHeader';
import { InteractiveHoverButton } from '../../../components/ui/interactive-hover-button';
import { Alert } from '../../../components/ui/Alert';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Tabs } from '../../../components/ui/Tabs';
import { Icons } from '../../../components/icons';
import { useExtensionStatus } from '../../../hooks/useExtensionStatus';
import { openVault } from '../../../lib/extension-bridge';
import { siteConfig } from '../../../lib/site-config';
import type { ExtensionStatus, SyncProviderId } from '@clyro/shared-types';

/** Dev-only override so every render state stays reviewable without installing
 * the extension. Stripped from production builds — see the render below. */
const PREVIEW_STATES: { id: string; label: string; status: ExtensionStatus }[] = [
  { id: 'live', label: 'Live', status: { installed: false } },
  { id: 'not-installed', label: 'Not installed', status: { installed: false } },
  { id: 'no-provider', label: 'No provider', status: { installed: true, provider: null, locked: true } },
  { id: 'local', label: 'Local', status: { installed: true, provider: 'local', locked: false } },
  { id: 'cloud', label: 'Cloud', status: { installed: true, provider: 'google-drive', locked: true } }
];

const PROVIDER_LABEL: Record<SyncProviderId, string> = {
  local: 'Local Sync Server',
  'google-drive': 'Google Drive',
  dropbox: 'Dropbox'
};

const ACCENT = '255, 255, 255';
const SUCCESS = '74, 222, 128';
const WARNING = '251, 191, 36';

const basementGrotesque = localFont({
  src: '../../../fonts/basement-grotesque/BasementGrotesque-Black.woff2',
  variable: '--font-basement-grotesque',
  display: 'swap'
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-space-grotesk',
  display: 'swap'
});

export default function DashboardPage() {
  const router = useRouter();
  const { status: liveStatus, loading, refresh } = useExtensionStatus();
  const [previewId, setPreviewId] = useState('live');
  const [openingVault, setOpeningVault] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);

  const showPreviewSwitcher = process.env.NODE_ENV === 'development';
  const override = showPreviewSwitcher ? PREVIEW_STATES.find(s => s.id === previewId) : undefined;
  const isOverridden = Boolean(override) && previewId !== 'live';
  const status = isOverridden ? override!.status : liveStatus;

  const handleOpenVault = async () => {
    setOpeningVault(true);
    setOpenFailed(false);
    const opened = await openVault();
    setOpeningVault(false);
    if (opened) {
      // Opening the vault tab can change the lock state; pick it up on return.
      void refresh();
    } else {
      setOpenFailed(true);
    }
  };

  const cards = !status.installed
    ? [
        {
          label: 'Extension',
          title: 'Not installed',
          description:
            'Install the Clyro extension for Chrome to create or unlock your vault. This website never renders vault contents — the extension is where your vault actually lives.',
          icon: <Icons.Download className="h-5 w-5" />,
          action: (
            <InteractiveHoverButton
              className="px-4 py-1.5 text-sm"
              onClick={() => window.open(siteConfig.chromeWebStoreUrl, '_blank', 'noopener,noreferrer')}
            >
              Install for Chrome
            </InteractiveHoverButton>
          ),
          className: 'sm:col-span-2 lg:col-span-2 lg:col-start-2'
        }
      ]
    : status.provider === null
      ? [
          {
            label: 'Local',
            title: 'Run it yourself',
            description: 'A small background app on your own machine. Free, and nothing ever leaves it.',
            icon: <Icons.Computer className="h-5 w-5" />,
            action: (
              <InteractiveHoverButton className="px-4 py-1.5 text-sm" onClick={() => router.push('/dashboard/setup/local')}>
                Set up Local
              </InteractiveHoverButton>
            ),
            className: 'lg:col-span-2'
          },
          {
            label: 'Cloud',
            title: 'Google Drive or Dropbox',
            description: 'Sync your encrypted vault to a cloud account you already have.',
            icon: <Icons.Cloud className="h-5 w-5" />,
            action: (
              <InteractiveHoverButton className="px-4 py-1.5 text-sm" onClick={() => router.push('/dashboard/setup/cloud')}>
                Set up Cloud
              </InteractiveHoverButton>
            ),
            className: 'lg:col-span-2'
          }
        ]
      : [
          {
            label: 'Storage',
            title: PROVIDER_LABEL[status.provider],
            description:
              status.provider === 'local'
                ? 'Syncing with your Local Sync Server.'
                : `Syncing with your ${PROVIDER_LABEL[status.provider]} account.`,
            icon: status.provider === 'local' ? <Icons.Database className="h-5 w-5" /> : <Icons.Cloud className="h-5 w-5" />
          },
          {
            label: 'Vault',
            title: status.locked ? 'Locked' : 'Unlocked',
            description: status.locked
              ? 'Unlock it in the extension to view or edit items.'
              : 'Your vault is unlocked in the extension right now.',
            icon: status.locked ? <Icons.Lock className="h-5 w-5" /> : <Icons.ShieldCheck className="h-5 w-5" />,
            glowColor: status.locked ? WARNING : SUCCESS
          },
          {
            label: 'Vault',
            title: 'Open Vault',
            description: "Opens the extension's full-page vault tab — this website never sees what's inside.",
            icon: <Icons.LayoutDashboard className="h-5 w-5" />,
            action: (
              <InteractiveHoverButton className="px-4 py-1.5 text-sm" isLoading={openingVault} onClick={handleOpenVault}>
                Open Vault
              </InteractiveHoverButton>
            ),
            className: 'lg:col-span-2'
          }
        ];

  return (
    <div className={`${basementGrotesque.variable} ${spaceGrotesk.variable}`}>
      <PageHeader
        title="Dashboard"
        subtitle="Launch your vault, or set up where it lives."
        titleClassName={basementGrotesque.className}
      />

      {showPreviewSwitcher && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-border bg-raised/50 px-4 py-3">
          <span className={`${spaceGrotesk.className} shrink-0 text-xs uppercase tracking-wider text-body`}>
            Preview state (dev only)
          </span>
          <Tabs
            tabs={PREVIEW_STATES.map(s => ({ id: s.id, label: s.label }))}
            activeTab={previewId}
            onChange={setPreviewId}
            labelClassName={spaceGrotesk.className}
          />
        </div>
      )}

      <Alert
        isVisible={openFailed}
        variant="warning"
        title="The extension didn't respond"
        description="Clyro couldn't reach the extension to open your vault. Make sure it's installed and enabled, then try again."
        onClose={() => setOpenFailed(false)}
        className="mb-6"
      />

      {loading && !isOverridden ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-48 sm:col-span-2 lg:col-span-2 lg:col-start-2" />
        </div>
      ) : (
        <MagicBento
          cards={cards}
          glowColor={ACCENT}
          enableTilt={false}
          enableMagnetism={false}
          enableStars={false}
          enableSpotlight
          enableBorderGlow
        />
      )}
    </div>
  );
}
