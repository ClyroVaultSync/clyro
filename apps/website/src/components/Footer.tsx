import React from 'react';
import CircularText from './CircularText/CircularText';
import { Link000, Link001 } from './ui/skiper-ui/skiper40';
import { siteConfig } from '../lib/site-config';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Download for Chrome', href: '/dashboard' },
      { label: 'Password Generator', href: '/password-generator' }
    ]
  },
  {
    title: 'Open Source',
    links: [
      { label: 'GitHub', href: siteConfig.githubUrl },
      { label: 'Contributing', href: siteConfig.contributingUrl }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Security', href: '/security' }
    ]
  }
];

export default function Footer() {
  return (
    <footer className="flex shrink-0 items-end justify-between gap-6 border-t border-border px-6 py-4">
      <div className="flex flex-col items-start gap-2">
        <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center">
          <div className="scale-[0.44]">
            <CircularText text="CLYRO • FREE & OPEN SOURCE • " onHover="speedUp" />
          </div>
        </div>
        <p className="text-xs text-body/70">&copy; {new Date().getFullYear()} Clyro. All rights reserved.</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {COLUMNS.map(column => (
          <div key={column.title} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-heading">{column.title}</span>
            <ul className="flex flex-col gap-1">
              {column.links.map(link => {
                // Link001 is the external variant (new tab + arrow); Link000
                // wraps next/link for in-app routes.
                const LinkComponent = link.href.startsWith('http') ? Link001 : Link000;
                return (
                  <li key={link.label}>
                    <LinkComponent
                      href={link.href}
                      className="text-xs text-body transition-colors hover:text-heading"
                    >
                      {link.label}
                    </LinkComponent>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
