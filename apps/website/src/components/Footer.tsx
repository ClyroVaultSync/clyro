import React from 'react';
import CircularText from './CircularText/CircularText';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Download for Chrome', href: '#download' },
      { label: 'Security', href: '#security' }
    ]
  },
  {
    title: 'Open Source',
    links: [
      { label: 'GitHub', href: '#' },
      { label: 'Contributing', href: '#' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security Policy', href: '#' }
    ]
  }
];

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 md:flex-row md:justify-between">
        <div className="flex flex-col gap-3">
          <CircularText text="CLYRO • FREE & OPEN SOURCE • " onHover="speedUp" />
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map(column => (
            <div key={column.title} className="flex flex-col gap-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-heading">{column.title}</span>
              <ul className="flex flex-col gap-2">
                {column.links.map(link => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-body transition-colors hover:text-heading">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-5xl text-xs text-body/70">
        &copy; {new Date().getFullYear()} Clyro. All rights reserved.
      </p>
    </footer>
  );
}
