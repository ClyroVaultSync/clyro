'use client';

import React from 'react';
import LiquidEther from '../../components/LiquidEther/LiquidEther';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <LiquidEther />
      </div>

      <Header />

      {children}

      <Footer />
    </div>
  );
}
