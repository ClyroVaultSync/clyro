'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import LiquidEther from './LiquidEther/LiquidEther';
import Header from './Header';
import Footer from './Footer';
import IntroGate from './IntroGate';

const MARKETING_PATHS = new Set(['/', '/password-generator']);

/**
 * Renders Header/Footer/LiquidEther once at the true app root so they never
 * unmount across navigation (including between the (marketing) and (app)
 * route groups) — GooeyNav's burst-particle animation in Header only
 * survives a route change if its container stays mounted through it, per
 * the client-routing note in GooeyNav.jsx.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketing = MARKETING_PATHS.has(pathname);

  const content = isMarketing ? (
    children
  ) : (
    <main className="app-container flex-1">{children}</main>
  );

  const chrome = (
    <div
      className={
        isMarketing
          ? 'flex h-screen w-screen flex-col overflow-hidden'
          : 'relative flex min-h-screen w-full flex-col'
      }
    >
      <div className="fixed inset-0 -z-10">
        <LiquidEther />
      </div>

      <Header />

      {content}

      <Footer />
    </div>
  );

  return <IntroGate disabled={!isMarketing}>{chrome}</IntroGate>;
}
