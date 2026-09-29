'use client';

import Link from 'next/link';
import Stepper, { Step } from '../../../../../components/Stepper';
import ExtensionInstallSteps from '../../../../../components/ExtensionInstallSteps';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Button } from '../../../../../components/ui/Button';
import { Alert } from '../../../../../components/ui/Alert';
import { Badge } from '../../../../../components/ui/Badge';
import { Icons } from '../../../../../components/icons';
import { useExtensionStatus } from '../../../../../hooks/useExtensionStatus';
import { siteConfig } from '../../../../../lib/site-config';

export default function LocalSetupPage() {
  const { status, loading, refresh } = useExtensionStatus();

  const isPaired = status.installed && status.provider === 'local';

  // Three distinct situations, and the instruction differs in each: the visitor
  // has no extension at all, has one but hasn't picked a provider, or is done.
  const pairingLabel = loading ? 'Checking…' : isPaired ? 'Paired' : 'Not paired';
  const pairingDetail = loading
    ? 'Checking whether the Clyro extension is installed…'
    : isPaired
      ? 'The extension is paired with your Local Sync Server.'
      : status.installed
        ? 'Open the Clyro extension, choose "Local Sync Server", then Connect.'
        : 'The Clyro extension isn’t installed yet — install it first, then come back to this step.';

  return (
    <>
      <PageHeader
        title="Set up Local storage"
        subtitle="Run the Local Sync Server on your own machine — your encrypted vault never leaves it."
      >
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <Icons.ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </PageHeader>

      <Stepper backButtonText="Back" nextButtonText="Next" renderStepIndicator={undefined}>
        <Step>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-heading">
              <Icons.Download className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold">Download the Local Sync Server</h3>
            </div>
            <p className="text-sm text-body">
              A small, self-run background app that stores your encrypted vault in a bundled SQLite
              database on this machine. It never sees your master password or decrypted credentials.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={siteConfig.localServerDownloadUrl}>
                <Button variant="primary" size="sm">
                  Download for Windows
                </Button>
              </a>
              <Button variant="secondary" size="sm" disabled>
                macOS (coming soon)
              </Button>
              <Button variant="secondary" size="sm" disabled>
                Linux (coming soon)
              </Button>
            </div>
          </div>
        </Step>

        <Step>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-heading">
              <Icons.Computer className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold">Install &amp; run it</h3>
            </div>
            <p className="text-sm text-body">
              Run the installer. The Local Sync Server starts right away and again every time you sign
              in to Windows — look for the Clyro icon near the clock. It listens on your own machine
              only (<code className="rounded-sm bg-raised px-1.5 py-0.5 font-mono text-xs text-heading">http://localhost:47821</code>)
              — nothing outside your network can reach it.
            </p>
            <p className="text-sm text-body">
              The installer isn’t code-signed yet. Chrome may say the file “isn’t commonly
              downloaded” — choose <span className="text-heading">Keep</span>. Windows may then show
              “Windows protected your PC” — choose{' '}
              <span className="text-heading">More info → Run anyway</span>.
            </p>
            <p className="text-sm text-body">
              Running the same binary on a home server or VPS instead of pure <code className="rounded-sm bg-raised px-1.5 py-0.5 font-mono text-xs text-heading">localhost</code> is
              a supported deployment of the identical server — the pairing token in the next step is
              what keeps that safe.
            </p>
          </div>
        </Step>

        <Step>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-heading">
              <Icons.Key className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold">Pair the extension</h3>
            </div>
            <p className="text-sm text-body">
              With the server running, the Clyro extension requests a pairing token from it and uses
              that token to authenticate every request afterward. Unpaired or mismatched-token requests
              are rejected by the server.
            </p>
            <div className="flex flex-col gap-3 rounded-md border border-border bg-raised p-4">
              <div className="flex items-center gap-2">
                <Badge variant={isPaired ? 'success' : 'neutral'}>{pairingLabel}</Badge>
              </div>
              <p className="text-sm text-body">{pairingDetail}</p>
              {status.installed || loading ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                  onClick={() => void refresh()}
                  isLoading={loading}
                >
                  <Icons.RefreshCw className="mr-2 h-4 w-4" />
                  Check again
                </Button>
              ) : (
                <>
                  <ExtensionInstallSteps />
                  <a href={siteConfig.extensionDownloadUrl} className="w-fit">
                    <Button variant="secondary" size="sm">
                      <Icons.Download className="mr-2 h-4 w-4" />
                      Download for Chrome
                    </Button>
                  </a>
                </>
              )}
            </div>
          </div>
        </Step>

        <Step>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-heading">
              <Icons.Database className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold">Back up your vault</h3>
            </div>
            <p className="text-sm text-body">
              There is no Clyro-run account to recover from. Your encrypted vault lives in{' '}
              <code className="rounded-sm bg-raised px-1.5 py-0.5 font-mono text-xs text-heading">%LOCALAPPDATA%\Clyro\clyro.db</code>{' '}
              — the Clyro tray icon’s <span className="text-heading">Open data folder</span> takes you
              straight there.
            </p>
            <Alert
              isVisible
              variant="warning"
              title="A lost clyro.db is a lost vault"
              description="The simplest backup is an encrypted export from the extension: one file you can keep anywhere, and the only way to move to Cloud storage later. To copy the database itself, first choose Quit from the tray icon, then copy the whole Clyro folder, including any clyro.db-wal file, which can hold your latest changes."
            />
          </div>
        </Step>
      </Stepper>
    </>
  );
}
