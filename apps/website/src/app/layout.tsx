import './globals.css';
import React from 'react';
import { Inter, IBM_Plex_Mono, Press_Start_2P } from 'next/font/google';
import { AuthProvider } from '../lib/auth-context';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { AmbientBackground } from '../components/motion/AmbientBackground';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono'
});
const pixel = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pixel-source'
});

export const metadata = {
  title: 'Clyro — Cloud-First Zero-Knowledge Password Vault Companion',
  description: 'Manage your trusted devices, sessions, and encrypted vault with Clyro.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable} ${pixel.variable}`}>
      <body className="font-sans flex flex-col min-h-screen">
        <AmbientBackground />
        <AuthProvider>
          <Navbar />
          <main className="app-container flex-grow w-full">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
