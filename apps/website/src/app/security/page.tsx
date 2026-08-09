'use client';

import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { PageTransition } from '../../components/motion/PageTransition';

export default function SecurityPage() {
  return (
    <PageTransition>
      <div className="pb-12 max-w-3xl mx-auto">
        <PageHeader 
          title="Security" 
          subtitle="Our security architecture and cryptographic standards." 
        />
        <Card className="p-8">
          <p className="text-body mb-4">
            This page is a placeholder — content coming soon.
          </p>
          <p className="text-body">
            Detailed whitepapers and information regarding AES-256-GCM, PBKDF2/Argon2id, and our E2EE synchronization will be published here.
          </p>
        </Card>
      </div>
    </PageTransition>
  );
}
