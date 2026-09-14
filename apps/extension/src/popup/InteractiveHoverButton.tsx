import React from 'react';
import './InteractiveHoverButton.css';

interface Props {
  children: React.ReactNode;
  onClick: () => void;
}

// Plain-CSS port of the website's InteractiveHoverButton
// (apps/website/src/components/ui/interactive-hover-button.tsx) — same shape,
// colors, and hover animation, without pulling Tailwind or lucide-react into
// the extension's build. Unlike the source component, the label is fixed to
// the button's true center at all times (only its color transitions) instead
// of sliding as part of a text+arrow group — the labels here are long enough
// ("Change Storage Options") that off-center sliding text looked wrong.
export default function InteractiveHoverButton({ children, onClick }: Props) {
  return (
    <button type="button" className="interactive-hover-button" onClick={onClick}>
      <span className="ihb-dot" />
      <span className="ihb-label">{children}</span>
      <span className="ihb-arrow">
        <ArrowRightIcon />
      </span>
    </button>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
