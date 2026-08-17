'use client';

import Link from 'next/link';
import { useState } from 'react';
import Stepper, { Step } from '../../../../../components/Stepper';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Button } from '../../../../../components/ui/Button';
import { Alert } from '../../../../../components/ui/Alert';
import { Badge } from '../../../../../components/ui/Badge';
import { Icons } from '../../../../../components/icons';

export default function LocalSetupPage() {
  const [pairing, setPairing] = useState<'idle' | 'waiting' | 'paired'>('idle');

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
              <Button variant="primary" size="sm">
                Download for Windows
              </Button>
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
                <Badge variant={pairing === 'paired' ? 'success' : 'neutral'}>
                  {pairing === 'paired' ? 'Paired' : pairing === 'waiting' ? 'Waiting…' : 'Not paired'}
                </Badge>
              </div>
              <p className="text-sm text-body">
                {pairing === 'paired'
                  ? 'The extension is paired with this Local Sync Server.'
                  : 'Open the Clyro extension and choose "Pair with Local Sync Server".'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setPairing('waiting');
                  setTimeout(() => setPairing('paired'), 900);
                }}
                disabled={pairing !== 'idle'}
              >
                <Icons.RefreshCw className="mr-2 h-4 w-4" />
                Simulate pairing
              </Button>
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
