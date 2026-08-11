'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Recreation of Skiper UI's "Words Preloader" (skiper8) public preview
 * (https://skiper-ui.com/v1/skiper8) — that component is Pro-only and its
 * source isn't available without a paid license, so this reproduces the
 * observed visual behavior (white panel, cycling words, curved curtain
 * exit revealing the page beneath) rather than lifting its proprietary code.
 * Left un-reskinned (white/black) per instruction — do not apply Clyro's
 * dark theme tokens here.
 */

const WORDS = ['Hello', 'Bonjour', 'Hola', 'Ciao', 'こんにちは', 'Welcome'];

const WORD_DURATION = 0.45;
const WORD_INTERVAL = 700;
const EXIT_START = WORDS.length * WORD_INTERVAL + 200;
const EXIT_DURATION = 950;

export default function WordsPreloader({
  onExitStart,
  onFinish
}: {
  onExitStart: () => void;
  onFinish: () => void;
}) {
  const [wordIndex, setWordIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (wordIndex >= WORDS.length - 1) return;
    const timer = setTimeout(() => setWordIndex((i) => i + 1), WORD_INTERVAL);
    return () => clearTimeout(timer);
  }, [wordIndex]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      onExitStart();
    }, EXIT_START);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-white"
      animate={
        exiting
          ? { y: '-110%', borderBottomLeftRadius: 160, borderBottomRightRadius: 160 }
          : { y: '0%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
      }
      transition={{ duration: EXIT_DURATION / 1000, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => {
        if (exiting) onFinish();
      }}
    >
      <div className="relative h-16 w-full overflow-hidden sm:h-20">
        <AnimatePresence>
          <motion.span
            key={WORDS[wordIndex]}
            initial={{ opacity: 0, y: 56, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -56, filter: 'blur(6px)' }}
            transition={{ duration: WORD_DURATION, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center text-5xl font-medium tracking-tight text-neutral-900 sm:text-6xl"
          >
            {WORDS[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
