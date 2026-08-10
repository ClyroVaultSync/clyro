'use client';

import React from 'react';
import AnimatedContent from './AnimatedContent/AnimatedContent';
import ScrollReveal from './ScrollReveal/ScrollReveal';
import { Icons } from './icons';

const BEATS = [
  {
    Icon: Icons.ShieldCheck,
    headline: 'Clyro never sees your passwords.',
    body: 'Our backend can never read your passwords, decrypt your vault, generate your encryption keys, or store your master password. True zero-knowledge, by design.'
  },
  {
    Icon: Icons.Lock,
    headline: 'Encrypted before it ever leaves your device.',
    body: 'Every credential is encrypted client-side with Argon2id key derivation and XChaCha20-Poly1305 authenticated encryption before it ever reaches our servers.'
  },
  {
    Icon: Icons.Key,
    headline: 'Your key lives in memory, not on disk.',
    body: 'The encryption key is derived from your master password and exists only in memory while your vault is unlocked. It is never permanently stored anywhere.'
  },
  {
    Icon: Icons.GitCommit,
    headline: 'Free, open-source, and yours to audit.',
    body: 'Clyro is a free password manager with a Chrome extension. The code is open source — verify every claim above for yourself on GitHub.'
  }
];

export default function SecurityStory() {
  return (
    <section id="security" className="mx-auto flex max-w-3xl flex-col gap-32 px-6 py-40">
      {BEATS.map(({ Icon, headline, body }, i) => (
        <AnimatedContent
          key={headline}
          container={undefined}
          direction="vertical"
          distance={60}
          reverse={i % 2 === 1}
          disappearAfter={3}
          disappearDuration={0.6}
          onComplete={undefined}
          onDisappearanceComplete={undefined}
          className="flex flex-col gap-4"
        >
          <Icon className="h-8 w-8 text-accent" />
          <ScrollReveal scrollContainerRef={undefined} containerClassName="text-heading">
            {headline}
          </ScrollReveal>
          <p className="max-w-xl text-body">{body}</p>
        </AnimatedContent>
      ))}
    </section>
  );
}
