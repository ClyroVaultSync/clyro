'use client';

import React, { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

const SPACING = 40;
const DOT_SIZE = 3;
const WAVE_RADIUS = 200;
const PUSH_DISTANCE = 22;

interface DotEntry {
  el: HTMLDivElement;
  x: number;
  y: number;
}

export function AmbientBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dots: DotEntry[] = [];
    let ticking = false;
    let idleAnimation: ReturnType<typeof animate> | null = null;

    function buildGrid() {
      container!.innerHTML = '';
      dots = [];
      const width = window.innerWidth;
      const height = window.innerHeight;
      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;
      const fragment = document.createDocumentFragment();

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * SPACING;
          const y = j * SPACING;
          const el = document.createElement('div');
          el.style.cssText = [
            'position:absolute',
            `left:${x}px`,
            `top:${y}px`,
            `width:${DOT_SIZE}px`,
            `height:${DOT_SIZE}px`,
            'border-radius:50%',
            'background:rgba(255,255,255,0.12)',
            'transform:translate(-50%,-50%)',
            'will-change:transform,opacity'
          ].join(';');
          fragment.appendChild(el);
          dots.push({ el, x, y });
        }
      }
      container!.appendChild(fragment);
    }

    function startIdleFlow() {
      idleAnimation?.pause();
      if (reducedMotionQuery.matches || dots.length === 0) return;
      idleAnimation = animate(
        dots.map((d) => d.el),
        {
          opacity: [0.35, 1],
          direction: 'alternate',
          loop: true,
          duration: 2200,
          delay: stagger(8),
          easing: 'easeInOutSine'
        }
      );
    }

    function handlePointerMove(e: PointerEvent) {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const px = e.clientX;
        const py = e.clientY;
        const mx = e.movementX;
        const my = e.movementY;
        const speed = Math.hypot(mx, my);
        if (speed < 2) return;

        const dirX = mx / speed;
        const dirY = my / speed;

        const affected = dots
          .map((d) => ({ ...d, dist: Math.hypot(d.x - px, d.y - py) }))
          .filter((d) => d.dist < WAVE_RADIUS)
          .sort((a, b) => a.dist - b.dist);

        if (affected.length === 0) return;

        affected.forEach((d, i) => {
          const falloff = 1 - d.dist / WAVE_RADIUS;
          const targetX = dirX * PUSH_DISTANCE * falloff;
          const targetY = dirY * PUSH_DISTANCE * falloff;

          animate(d.el, {
            translateX: [
              { to: targetX, duration: 220, easing: 'easeOutSine' },
              { to: 0, duration: 600, easing: 'easeInOutSine' }
            ],
            translateY: [
              { to: targetY, duration: 220, easing: 'easeOutSine' },
              { to: 0, duration: 600, easing: 'easeInOutSine' }
            ],
            opacity: [
              { to: Math.min(1, 0.5 + falloff), duration: 180, easing: 'easeOutSine' },
              { to: 1, duration: 700, easing: 'easeInOutSine' }
            ],
            delay: i * 10
          });
        });
      });
    }

    function handleResize() {
      buildGrid();
      startIdleFlow();
    }

    function handleMotionPrefChange() {
      startIdleFlow();
    }

    buildGrid();
    startIdleFlow();

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    reducedMotionQuery.addEventListener('change', handleMotionPrefChange);

    return () => {
      idleAnimation?.pause();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      reducedMotionQuery.removeEventListener('change', handleMotionPrefChange);
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
}
