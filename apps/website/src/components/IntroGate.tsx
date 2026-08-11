'use client';

import React, { useLayoutEffect, useState } from 'react';
import WordsPreloader from './WordsPreloader';

const STORAGE_KEY = 'clyro:intro-seen';

type Phase = 'checking' | 'intro' | 'done';

/**
 * Gates the site behind WordsPreloader once per browser tab/session.
 * Persisted in sessionStorage (not localStorage) so it never replays on
 * refresh or on internal navigation within the same tab, but a brand new
 * tab — which starts with its own empty sessionStorage — plays it again.
 *
 * The 'checking' phase (server render + first client render, before
 * sessionStorage can be read) covers the screen with the site's own dark
 * background instead of the preloader's white panel — a returning visitor's
 * browser never paints white for even a frame while we determine which
 * phase applies. useLayoutEffect resolves this before the browser paints
 * the hydrated frame.
 *
 * The site itself isn't mounted until the preloader's curtain starts
 * lifting (WordsPreloader's onExitStart), not for the whole word-cycling
 * duration — so mount-triggered entrance animations underneath (e.g. the
 * homepage's ParticleText "Clyro" heading) begin right as the curtain
 * reveals them, reading as one continuous animation rather than something
 * that already finished forming behind a white screen.
 */
export default function IntroGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [revealSite, setRevealSite] = useState(false);

  useLayoutEffect(() => {
    const seen = window.sessionStorage.getItem(STORAGE_KEY) === '1';
    setPhase(seen ? 'done' : 'intro');
  }, []);

  if (phase === 'checking') {
    return <div className="fixed inset-0 z-[999] bg-base" />;
  }

  return (
    <>
      {phase === 'intro' && (
        <WordsPreloader
          onExitStart={() => setRevealSite(true)}
          onFinish={() => {
            window.sessionStorage.setItem(STORAGE_KEY, '1');
            setPhase('done');
          }}
        />
      )}
      {(phase === 'done' || revealSite) && children}
    </>
  );
}
