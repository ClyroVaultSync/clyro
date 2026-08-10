'use client';

import React from 'react';
import LiquidEther from '../components/LiquidEther/LiquidEther';
import ParticleText from '../components/ParticleText/ParticleText';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <LiquidEther />
      </div>

      <Header />

      <main className="relative flex-1">
        <div className="absolute inset-0">
          <ParticleText text="Clyro" scatter={700} style={undefined} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
