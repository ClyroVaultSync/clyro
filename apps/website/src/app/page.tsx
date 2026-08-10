'use client';

import React from 'react';
import LiquidEther from '../components/LiquidEther/LiquidEther';
import ParticleText from '../components/ParticleText/ParticleText';

export default function Home() {
  return (
    <div className="fixed inset-0 h-screen w-screen">
      <LiquidEther />
      <div className="absolute inset-0 -translate-y-[35vh]">
        <ParticleText text="Clyro" scatter={700} />
      </div>
    </div>
  );
}
