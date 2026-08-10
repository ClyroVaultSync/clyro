'use client';

import React from 'react';
import LiquidEther from '../components/LiquidEther/LiquidEther';
import ParticleText from '../components/ParticleText/ParticleText';
import Header from '../components/Header';
import SecurityStory from '../components/SecurityStory';
import Footer from '../components/Footer';
import { LogoLoop as LogoLoopComponent } from '../components/LogoLoop/LogoLoop';
import { Button } from '../components/ui/Button';
import { Icons } from '../components/icons';

const LogoLoop = LogoLoopComponent as React.ComponentType<{
  logos: Array<{ src?: string; alt?: string; node?: React.ReactNode; ariaLabel?: string; href?: string }>;
  speed?: number;
  logoHeight?: number;
  gap?: number;
  pauseOnHover?: boolean;
  fadeOut?: boolean;
}>;

const TRUST_LOGOS = [
  { src: '/chrome-logo.svg', alt: 'Chrome', href: '#download' },
  { node: <Icons.GitFork className="h-7 w-7 text-heading" />, ariaLabel: 'GitHub', href: '#' }
];

export default function Home() {
  return (
    <>
      <Header />

      <div className="fixed inset-0 -z-10">
        <LiquidEther />
      </div>

      <section className="relative h-screen w-screen">
        <div className="absolute inset-0 -translate-y-[35vh]">
          <ParticleText text="Clyro" scatter={700} style={undefined} />
        </div>

        <div className="absolute inset-x-0 bottom-[15vh] flex flex-col items-center gap-6 text-center">
          <p className="max-w-md text-body">
            A free, open-source password manager with a zero-knowledge Chrome extension.
          </p>
          <div className="flex gap-3">
            <Button variant="primary">Add to Chrome</Button>
            <Button variant="secondary">View on GitHub</Button>
          </div>
        </div>
      </section>

      <SecurityStory />

      <section id="download" className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-32 text-center">
        <h2 className="text-2xl font-semibold text-heading">Free. Open source. Yours.</h2>
        <div className="flex gap-3">
          <Button variant="primary">Add to Chrome — It&apos;s Free</Button>
          <Button variant="secondary">Star on GitHub</Button>
        </div>
        <div className="h-16 w-full max-w-md">
          <LogoLoop logos={TRUST_LOGOS} speed={60} logoHeight={32} gap={48} pauseOnHover fadeOut />
        </div>
      </section>

      <Footer />
    </>
  );
}
