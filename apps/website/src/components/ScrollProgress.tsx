'use client';

import { useEffect, useState } from 'react';

/**
 * Reading-progress bar for long documents (the legal pages). Hand-built rather
 * than sourced: the Skiper UI equivalent is a paid Pro component, and this is
 * small enough that a dependency would cost more than it saves.
 *
 * Fixed to the top of the viewport and above the site chrome, which works
 * because `SiteChrome` gives non-marketing routes whole-page scroll — the
 * document itself scrolls, so `window.scrollY` is the right thing to read.
 */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // A page shorter than the viewport has nothing to progress through;
      // reporting 100% there would show a permanently full bar.
      setProgress(scrollable <= 0 ? 0 : Math.min(1, window.scrollY / scrollable));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent" aria-hidden="true">
      <div
        className="h-full bg-accent"
        style={{ width: `${progress * 100}%`, transition: 'width 80ms linear' }}
      />
    </div>
  );
}
