import './globals.css';
import React from 'react';
import { Inter, IBM_Plex_Mono } from 'next/font/google';
import SiteChrome from '../components/SiteChrome';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono'
});

export const metadata = {
  title: 'Clyro — Local-First Zero-Knowledge Password Vault',
  description: 'A local-first, zero-knowledge password manager with bring-your-own-storage sync.'
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
