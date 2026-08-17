'use client';

import { useEffect, useRef } from 'react';
import { createScope, type Scope } from 'animejs';

/**
 * Entry point for all anime.js usage in this app. Scopes animations to a root
 * element and reverts them automatically on unmount/dependency change, so
 * callers never have to hand-roll createScope/cleanup themselves.
 *
 * Usage:
 *   const rootRef = useAnimeScope<HTMLDivElement>(scope => {
 *     animate(scope.root, { opacity: [0, 1] });
 *   });
 *   return <div ref={rootRef}>...</div>;
 */
export function useAnimeScope<T extends HTMLElement | SVGElement = HTMLElement>(
  setup: (scope: Scope) => void,
  deps: React.DependencyList = []
) {
  const rootRef = useRef<T>(null);

  useEffect(() => {
    const scope = createScope({ root: rootRef }).add((scope) => setup(scope as Scope));
    return () => scope.revert();
    // The dependency array is a pass-through parameter, which the hooks linter
    // cannot statically verify — the standard limitation for custom hooks that
    // forward deps. Correctness is the caller's job: list everything `setup`
    // closes over. `setup` itself is excluded deliberately, since callers pass
    // an inline arrow and depending on it would re-create the anime scope on
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rootRef;
}
