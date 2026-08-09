import React from 'react';
import Link from 'next/link';
import { Icons } from './icons';

export function Footer() {
  return (
    <footer className="border-t border-border bg-base mt-auto">
      <div className="app-container flex flex-col md:flex-row justify-between items-center gap-6 py-8 !min-h-0">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" className="flex items-center gap-2 font-semibold text-heading transition-opacity hover:opacity-80">
            <Icons.Key className="h-5 w-5 text-accent" />
            <span>Clyro</span>
          </Link>
          <p className="text-sm text-body">
            Cloud-First Zero-Knowledge Password Vault.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm text-body">
          <Link href="/privacy" className="hover:text-heading transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-heading transition-colors">Terms of Service</Link>
          <Link href="/security" className="hover:text-heading transition-colors">Security</Link>
        </div>
      </div>
      
      <div className="border-t border-border/50 py-6 text-center">
        <p className="text-xs text-body">
          &copy; {new Date().getFullYear()} Clyro. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
