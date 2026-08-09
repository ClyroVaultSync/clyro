'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icons } from '../components/icons';
import { useAnimeScope } from '../hooks/useAnimeScope';
import { animate, stagger } from 'animejs';
import { PageTransition } from '../components/motion/PageTransition';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Scroll reveal hook for sections
  const heroRef = useAnimeScope<HTMLDivElement>(() => {
    animate('.hero-element', {
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 600,
      delay: stagger(100),
      easing: 'easeOutExpo',
    });
  });

  const featureRef = useAnimeScope<HTMLDivElement>((scope) => {
    // Basic intersection observer for scroll reveal
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target.querySelectorAll('.feature-card'), {
            translateY: [20, 0],
            opacity: [0, 1],
            duration: 600,
            delay: stagger(100),
            easing: 'easeOutExpo',
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    if (scope.root) {
      observer.observe(scope.root as Element);
    }
  });

  const statRef = useAnimeScope<HTMLDivElement>((scope) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const endpointsEl = entry.target.querySelector('.stat-endpoints');
          if (endpointsEl) {
            animate(endpointsEl, {
              innerHTML: [0, 18],
              round: 1,
              duration: 1500,
              easing: 'easeOutExpo',
            });
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    
    if (scope.root) {
      observer.observe(scope.root as Element);
    }
  });

  return (
    <PageTransition>
      <div className="flex flex-col gap-24 pb-24 pt-12">
        {/* Hero Section */}
        <section ref={heroRef} className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h2 className="hero-element font-pixel mb-8 text-2xl leading-relaxed tracking-[0.2em] text-accent sm:text-3xl md:text-4xl">
            CLYRO
          </h2>

          <Badge variant="success" className="hero-element mb-6 px-3 py-1">
            Backend Complete • <span className="stat-endpoints inline-block min-w-[20px]">18</span> Endpoints Live
          </Badge>
          
          <h1 className="hero-element text-5xl font-bold tracking-tight text-heading sm:text-6xl md:text-7xl">
            Zero-Knowledge Password Management. <br className="hidden md:block" />
            <span className="text-accent">Zero</span> Server Plaintext.
          </h1>
          
          <p className="hero-element mt-6 max-w-2xl text-lg text-body sm:text-xl">
            Clyro stores only encrypted vault payloads. Your master password, encryption keys, and credentials never touch our servers.
          </p>
          
          <div className="hero-element mt-10 flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
            {isAuthenticated ? (
              <>
                <Button size="default" variant="primary" className="w-full sm:w-auto px-8" onClick={() => router.push('/vault')}>
                  Open Vault Shell
                </Button>
                <Button size="default" variant="secondary" className="w-full sm:w-auto px-8" onClick={() => router.push('/devices')}>
                  Manage Devices
                </Button>
              </>
            ) : (
              <>
                <Button size="default" variant="primary" className="w-full sm:w-auto px-8" onClick={() => router.push('/register')}>
                  Create Free Account
                </Button>
                <Button size="default" variant="secondary" className="w-full sm:w-auto px-8" onClick={() => router.push('/login')}>
                  Sign In
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Mockup / Trust Section */}
        <section ref={statRef} className="mx-auto w-full max-w-5xl px-4">
          <div className="rounded-xl border border-border bg-raised/50 p-2 overflow-hidden relative group">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
            <div className="relative rounded-lg border border-border bg-base p-8 md:p-12 shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
              <div className="flex gap-12 flex-wrap justify-center opacity-70 grayscale">
                <div className="flex items-center gap-2 text-xl font-bold font-mono tracking-tighter"><Icons.Shield className="h-6 w-6"/> AES-256-GCM</div>
                <div className="flex items-center gap-2 text-xl font-bold font-mono tracking-tighter"><Icons.Key className="h-6 w-6"/> PBKDF2</div>
                <div className="flex items-center gap-2 text-xl font-bold font-mono tracking-tighter"><Icons.Globe className="h-6 w-6"/> E2EE Sync</div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section ref={featureRef} className="mx-auto w-full max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card hoverLift className="feature-card opacity-0">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icons.Lock className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-heading">
                True Zero-Knowledge
              </h3>
              <p className="text-sm text-body">
                All cryptographic operations occur on trusted client devices. Backend endpoints only store opaque encrypted blobs.
              </p>
            </Card>

            <Card hoverLift className="feature-card opacity-0">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icons.Computer className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-heading">
                Trusted Device Sync
              </h3>
              <p className="text-sm text-body">
                Register, view, and revoke device authorization dynamically via `GET/DELETE /api/v1/devices`.
              </p>
            </Card>

            <Card hoverLift className="feature-card opacity-0">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icons.MonitorSmartphone className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-heading">
                Session Control
              </h3>
              <p className="text-sm text-body">
                Monitor active sessions, perform single-session revocations, or trigger a global log out across all devices.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
