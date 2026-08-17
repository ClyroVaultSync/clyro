'use client';

import Link from 'next/link';
import Stepper, { Step } from '../../../../../components/Stepper';
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
  const downloadUrl = siteConfig.localServerDownloadUrl;

  // Three distinct situations, and the instruction differs in each: the visitor
  // has no extension at all, has one but hasn't picked a provider, or is done.
  const pairingLabel = loading ? 'Checking…' : isPaired ? 'Paired' : 'Not paired';
  const pairingDetail = loading
    ? 'Checking whether the Clyro extension is installed…'
    : isPaired
      ? 'The extension is paired with your Local Sync Server.'
      : status.installed
        ? 'Open the Clyro extension and choose "Pair with Local Sync Server".'
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
              {downloadUrl ? (
                <a href={downloadUrl} rel="noopener noreferrer">
                  <Button variant="primary" size="sm">
                    Download for Windows
                  </Button>
                </a>
              ) : (
                <Button variant="primary" size="sm" disabled>
                  Windows (coming soon)
                </Button>
              )}
              <Button variant="secondary" size="sm" disabled>
                macOS (coming soon)
              </Button>
              <Button variant="secondary" size="sm" disabled>
                Linux (coming soon)
              </Button>
            </div>
            {!downloadUrl && (
              <p className="text-xs text-body/70">
                The Local Sync Server isn’t released yet. Cloud storage is available today, or watch the{' '}
                <a
                  href={siteConfig.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-heading underline underline-offset-2"
                >
                  GitHub repository
                </a>{' '}
                for the release.
              </p>
            )}
          </div>
        </Step>

        <Step>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-heading">
              <Icons.Computer className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold">Install &amp; run it</h3>
            </div>
            <p className="text-sm text-body">
              Run the installer, then start the Local Sync Server. It listens on your own machine only
              (<code className="rounded-sm bg-raised px-1.5 py-0.5 font-mono text-xs text-heading">http://localhost</code>)
              — nothing outside your network can reach it.
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
                <a href={siteConfig.chromeWebStoreUrl} target="_blank" rel="noopener noreferrer" className="w-fit">
                  <Button variant="secondary" size="sm">
                    <Icons.Download className="mr-2 h-4 w-4" />
                    Install the extension
                  </Button>
                </a>
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
              There is no Clyro-run account to recover from. Your encrypted vault lives entirely in one
              file, <code className="rounded-sm bg-raised px-1.5 py-0.5 font-mono text-xs text-heading">clyro.db</code>, wherever
              the Local Sync Server stores it.
            </p>
            <Alert
              isVisible
              variant="warning"
              title="A lost clyro.db is a lost vault"
              description="Back up this file the same way you'd back up any other irreplaceable data — copy it somewhere safe on a schedule. You can also export an encrypted vault backup from the extension at any time, which is also the only way to move to Cloud storage later."
            />
          </div>
        </Step>
      </Stepper>
    </>
  );
}
