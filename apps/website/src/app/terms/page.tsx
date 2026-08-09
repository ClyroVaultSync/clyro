'use client';

import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { PageTransition } from '../../components/motion/PageTransition';

export default function TermsPage() {
  return (
    <PageTransition>
      <div className="pb-12 max-w-3xl mx-auto">
        <PageHeader 
          title="Terms of Service" 
          subtitle="Our terms and conditions of use." 
        />
        <Card className="p-8">
          <p className="text-body mb-4">
            This page is a placeholder — content coming soon.
          </p>
          <p className="text-body">
            Please review our rules and guidelines for using the Clyro companion app and synchronization service.
          </p>
        </Card>
      </div>
    </PageTransition>
  );
}
