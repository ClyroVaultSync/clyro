'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import GooeyNav from './GooeyNav';
import MetallicPaint from './MetallicPaint';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Password Generator', href: '/password-generator' },
  { label: 'Dashboard', href: '/dashboard' }
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = NAV_ITEMS.findIndex(item => item.href === pathname);

  return (
    <header className="relative z-50 grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
      <div className="h-10 w-10">
        <MetallicPaint imageSrc="/monogram.svg" />
      </div>
      <GooeyNav
        items={NAV_ITEMS}
        initialActiveIndex={Math.max(activeIndex, 0)}
        onNavigate={router.push}
      />
      <div />
    </header>
  );
}
