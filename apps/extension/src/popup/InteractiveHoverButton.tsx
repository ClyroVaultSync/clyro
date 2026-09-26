import React from 'react';
import './InteractiveHoverButton.css';

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /**
   * The default padding/arrow-inset is tuned for full-width buttons with
   * room to spare between the centered label and the right-edge arrow. In
   * a narrow container (e.g. a 100px-wide wrapper) that same spacing puts
   * the arrow right up against short labels like "Lock" or "Copy" — this
   * switches to tighter padding and a closer-in arrow inset that still
   * leaves a real gap at that width.
   */
  compact?: boolean;
  /** 'danger' floods red instead of purple — for destructive actions like Delete. */
  variant?: 'default' | 'danger';
}

// Plain-CSS port of the website's InteractiveHoverButton
// (apps/website/src/components/ui/interactive-hover-button.tsx) — same shape,
// colors, and hover animation, without pulling Tailwind or lucide-react into
// the extension's build. Unlike the source component, the label is fixed to
// the button's true center at all times (only its color transitions) instead
// of sliding as part of a text+arrow group — the labels here are long enough
// ("Change Storage Options") that off-center sliding text looked wrong.
export default function InteractiveHoverButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  compact = false,
  variant = 'default',
}: Props) {
  const className =
    'interactive-hover-button' +
    (compact ? ' interactive-hover-button--compact' : '') +
    (variant === 'danger' ? ' interactive-hover-button--danger' : '');
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled}>
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
