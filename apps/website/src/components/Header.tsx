'use client';

import React from 'react';
import SpecularButton from './SpecularButton/SpecularButton';

export default function Header() {
  return (
    <header className="relative z-50 flex shrink-0 items-center justify-end px-6 py-4">
      <SpecularButton size="sm" onClick={undefined}>
        Continue with Google
      </SpecularButton>
    </header>
  );
}
