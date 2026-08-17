import React from 'react';
import { InteractiveHoverButton } from './ui/interactive-hover-button';
import { siteConfig } from '../lib/site-config';

export default function CtaButtons() {
  return (
    <div
      className="relative z-10 flex items-center justify-center gap-4"
      style={{ '--color-accent': '#8b5cf6' } as React.CSSProperties}
    >
      <InteractiveHoverButton href="/dashboard">Download for Chrome</InteractiveHoverButton>
      <InteractiveHoverButton href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer">
        View on GitHub
      </InteractiveHoverButton>
    </div>
  );
}
