'use client';

import FuzzyText from './FuzzyText';

interface ErrorPageProps {
  code: string | number;
  message: string;
}

export default function ErrorPage({ code, message }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <FuzzyText fontSize="clamp(4rem, 18vw, 12rem)" fontWeight={900} color="#fff" baseIntensity={0.15} hoverIntensity={0.4}>
        {code}
      </FuzzyText>
      <p className="text-body max-w-md text-base">{message}</p>
    </div>
  );
}
