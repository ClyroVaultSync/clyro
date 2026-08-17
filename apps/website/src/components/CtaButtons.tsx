import React from 'react';
import { InteractiveHoverButton } from './ui/interactive-hover-button';

export default function CtaButtons() {
  return (
    <div
      className="relative z-10 flex items-center justify-center gap-4"
      style={{ '--color-accent': '#8b5cf6' } as React.CSSProperties}
    >
      <InteractiveHoverButton href="/dashboard">Download for Chrome</InteractiveHoverButton>
      <InteractiveHoverButton href="#">View on GitHub</InteractiveHoverButton>
    </div>
  );
}
