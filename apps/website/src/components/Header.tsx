'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import PillNav from './PillNav/PillNav';
import SpecularButton from './SpecularButton/SpecularButton';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Security', href: '#security' },
  { label: 'Download', href: '#download' }
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-4">
      <span className="text-lg font-semibold tracking-wide text-white">Clyro</span>

      <div className="relative [&>.pill-nav-container]:static">
        <PillNav
          logo="/clyro-mark.svg"
          logoAlt="Clyro"
          items={NAV_ITEMS}
          activeHref={pathname}
          pillTextColor={undefined}
          onMobileMenuClick={undefined}
        />
      </div>

      <SpecularButton size="sm" onClick={undefined}>
        Continue with Google
      </SpecularButton>
    </header>
  );
}
