import React, { useCallback, useState } from 'react';
import OptionWheel, { OptionWheelProps } from './OptionWheel';
import InteractiveHoverButton from './InteractiveHoverButton';

interface Props {
  items: string[];
  defaultSelected?: number;
  onConfirm: (index: number, item: string) => void;
  wheelProps?: Partial<OptionWheelProps>;
  /** Lets a caller nudge this block's position (e.g. `marginTop`) without a wrapper div. */
  style?: React.CSSProperties;
}

// The popup is a fixed 380x540px (index.html) and labels here are multi-word
// ("Change Storage Options"), unlike the component's one-word demo items —
// fontSize is well below the demo default so the longest label never clips.
// `spacing` is what actually controls how far apart items sit vertically
// (it doesn't affect text width at all), so it's the dial for making the
// wheel use the full height it's given without risking overflow sideways.
const WHEEL_DEFAULTS: Partial<OptionWheelProps> = {
  fontSize: 1.7,
  spacing: 3.1,
  inset: 20,
  side: 'left',
  tilt: 4,
  curve: 0.6,
  // Non-looping meant whichever item defaults as centered has nothing above
  // it (nothing at index -1) — a big dead zone at rest — and the item at the
  // far end sits (count - 1) rows from center, close enough to the box edge
  // to get hard-clipped by `overflow: hidden` before it's faded out. Looping
  // caps every item's distance from center at floor(count / 2) instead —
  // roughly half as far — always with something on both sides, comfortably
  // inside the box instead of brushing its edge.
  loop: true,
};

/**
 * Scroll/drag only ever highlights an item — OptionWheel's own onChange fires
 * on settle regardless of how it got there, which is too easy to trigger by
 * accident for actions like uninstalling the extension. Running an action
 * always goes through this explicit confirm button (or Enter).
 */
export default function WheelPicker({ items, defaultSelected = 0, onConfirm, wheelProps, style }: Props) {
  const [highlightedIndex, setHighlightedIndex] = useState(defaultSelected);

  const handleConfirm = useCallback(() => {
    onConfirm(highlightedIndex, items[highlightedIndex]);
  }, [highlightedIndex, items, onConfirm]);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, gap: '12px', ...style }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleConfirm();
      }}
    >
      <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative' }}>
        <OptionWheel
          items={items}
          defaultSelected={defaultSelected}
          onChange={setHighlightedIndex}
          {...WHEEL_DEFAULTS}
          {...wheelProps}
        />
      </div>
      <InteractiveHoverButton onClick={handleConfirm}>{items[highlightedIndex]}</InteractiveHoverButton>
    </div>
  );
}
