import React, { useEffect, useRef, useState } from "react";
import { CopyIcon, CheckIcon } from "./VaultIcons";
import "./CopyIconButton.css";

interface Props {
  onCopy: () => void;
  size?: number;
  title?: string;
  style?: React.CSSProperties;
}

// Plain-CSS port of a shadcn/Tailwind "CopyButton" (check/copy icon
// cross-fade on click) — same porting pattern as InteractiveHoverButton.tsx:
// no Tailwind/lucide-react/shadcn structure in this Vite extension build.
// This component only owns the click-confirmation animation; the actual
// clipboard write stays with the caller's onCopy. The source it was ported
// from calls navigator.clipboard.writeText directly, which is exactly the
// bug this codebase already hit and fixed for extension contexts (see
// "Extension popup clipboard writes need an offscreen document") — copies
// here still go through VaultList's existing chrome.runtime.sendMessage
// flow instead.
export default function CopyIconButton({ onCopy, size = 16, title = "Copy", style }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleClick = () => {
    onCopy();
    setCopied(true);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      className="vault-icon-btn copy-icon-btn"
      onClick={handleClick}
      disabled={copied}
      aria-label={copied ? "Copied" : title}
      title={copied ? "Copied" : title}
      style={style}
    >
      <span className={`copy-icon-layer copy-icon-check${copied ? " is-active" : ""}`}>
        <CheckIcon size={size} />
      </span>
      <span className={`copy-icon-layer copy-icon-copy${copied ? " is-inactive" : ""}`}>
        <CopyIcon size={size} />
      </span>
    </button>
  );
}
