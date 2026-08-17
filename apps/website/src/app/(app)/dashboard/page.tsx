'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import localFont from 'next/font/local';
import { Space_Grotesk } from 'next/font/google';
import MagicBento from '../../../components/MagicBento';
import { PageHeader } from '../../../components/ui/PageHeader';
import { InteractiveHoverButton } from '../../../components/ui/interactive-hover-button';
import { Tabs } from '../../../components/ui/Tabs';
import { Icons } from '../../../components/icons';
import { useExtensionStatus } from '../../../hooks/useExtensionStatus';
import type { SyncProviderId } from '@clyro/shared-types';

const PREVIEW_STATES = [
  { id: 'not-installed', label: 'Not installed' },
  { id: 'no-provider', label: 'No provider' },
  { id: 'local', label: 'Local' },
  { id: 'cloud', label: 'Cloud' }
] as const;

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
  const { status, setStatus } = useExtensionStatus({ installed: false });
  const [previewState, setPreviewState] = useState<(typeof PREVIEW_STATES)[number]['id']>('not-installed');
  const [openingVault, setOpeningVault] = useState(false);

  const handlePreviewChange = (id: string) => {
    setPreviewState(id as (typeof PREVIEW_STATES)[number]['id']);
    if (id === 'not-installed') setStatus({ installed: false });
    if (id === 'no-provider') setStatus({ installed: true, provider: null, locked: true });
    if (id === 'local') setStatus({ installed: true, provider: 'local', locked: false });
    if (id === 'cloud') setStatus({ installed: true, provider: 'google-drive', locked: true });
  };

  const handleOpenVault = () => {
    setOpeningVault(true);
    setTimeout(() => setOpeningVault(false), 700);
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
              onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}
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

      <div className="mb-6 flex items-center gap-3 rounded-md border border-border bg-raised/50 px-4 py-3">
        <span className={`${spaceGrotesk.className} shrink-0 text-xs uppercase tracking-wider text-body`}>
          Preview state (mock)
        </span>
        <Tabs
          tabs={PREVIEW_STATES.map(s => ({ id: s.id, label: s.label }))}
          activeTab={previewState}
          onChange={handlePreviewChange}
          labelClassName={spaceGrotesk.className}
        />
      </div>

      <MagicBento
        cards={cards}
        glowColor={ACCENT}
        enableTilt={false}
        enableMagnetism={false}
        enableStars={false}
        enableSpotlight
        enableBorderGlow
      />
    </div>
  );
}
