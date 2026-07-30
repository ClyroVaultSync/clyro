import './globals.css';
import React from 'react';
import { AuthProvider } from '../lib/auth-context';
import { Navbar } from '../components/Navbar';

export const metadata = {
  title: 'Clyro — Cloud-First Zero-Knowledge Password Vault Companion',
  description: 'Manage your trusted devices, sessions, and encrypted vault with Clyro.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="app-container">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
