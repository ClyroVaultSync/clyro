'use client';

import React from 'react';
import ParticleText from '../../components/ParticleText/ParticleText';
import CtaButtons from '../../components/CtaButtons';
import TextType from '../../components/TextType';

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6">
      <div className="relative h-48 w-full max-w-2xl shrink-0">
        <ParticleText text="Clyro" scatter={700} style={undefined} />
      </div>
      <CtaButtons />
      <TextType
        text="Clyro is a free, open-source, zero-knowledge password manager for Chrome. Choose where your vault lives — a server you run yourself, or your own Google Drive or Dropbox — it's encrypted either way, so only you can ever read it."
        typingSpeed={35}
        pauseDuration={4000}
        loop={false}
        showCursor={true}
        variableSpeed={undefined}
        onSentenceComplete={undefined}
        className="max-w-xl px-6 text-center text-sm text-body md:text-[1rem]"
      />
    </main>
  );
}
