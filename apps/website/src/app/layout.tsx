import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { Inter, IBM_Plex_Mono } from 'next/font/google';
import SiteChrome from '../components/SiteChrome';
import { siteConfig } from '../lib/site-config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono'
});

const TITLE = 'Clyro — Local-First Zero-Knowledge Password Vault';

export const metadata: Metadata = {
  // Required for the relative OG/Twitter image paths below to resolve to
  // absolute URLs. Points at the placeholder domain until a real one exists.
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: TITLE,
    // Page-level `title` values fill the %s, so /privacy reads
    // "Privacy Policy — Clyro" without each page repeating the suffix.
    template: '%s — Clyro'
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'password manager',
    'zero-knowledge',
    'local-first',
    'open source',
    'Chrome extension',
    'self-hosted'
  ],
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    title: TITLE,
    description: siteConfig.description,
    url: siteConfig.siteUrl
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: siteConfig.description
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body className="font-sans flex flex-col min-h-screen">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
