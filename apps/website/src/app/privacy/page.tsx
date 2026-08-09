'use client';

import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { PageTransition } from '../../components/motion/PageTransition';

export default function PrivacyPage() {
  return (
    <PageTransition>
      <div className="pb-12 max-w-3xl mx-auto">
        <PageHeader 
          title="Privacy Policy" 
          subtitle="How we protect and handle your data." 
        />
        <Card className="p-8">
          <p className="text-body mb-4">
            This page is a placeholder — content coming soon.
          </p>
          <p className="text-body">
            Clyro is built on zero-knowledge architecture. We cannot read your passwords, vault items, or master key. 
          </p>
        </Card>
      </div>
    </PageTransition>
  );
}
