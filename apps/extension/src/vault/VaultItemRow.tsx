import React, { useState } from "react";
import type { VaultItem } from "@clyro/shared-types";
import InteractiveHoverButton from "../popup/InteractiveHoverButton";
import { EyeIcon, EyeOffIcon } from "./VaultIcons";
import CopyIconButton from "./CopyIconButton";

interface Props {
  item: VaultItem;
  onCopy: (text: string) => void;
  onEdit: () => void;
}

// Shared with VaultList's column-header row so the two stay aligned. The last
// column fits the compact Edit button (same 100px as the page's other compact
// buttons).
export const ROW_GRID_COLUMNS = "1fr 140px 120px 32px 100px";

// Flat, desaturated palette for the letter-avatar fallback (no real favicon
// fetching — see the plan's note on why: it would leak every saved site's
// domain to a third-party icon service). Deterministic per item so the same
// item always gets the same color across renders.
const AVATAR_COLORS = ["#8b5cf6", "#f59e0b", "#22c55e", "#38bdf8", "#f43f5e", "#a3a3a3"];

function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export default function VaultItemRow({ item, onCopy, onEdit }: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className="vault-row"
      style={{
        display: "grid",
        gridTemplateColumns: ROW_GRID_COLUMNS,
        alignItems: "center",
        padding: "12px 8px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: avatarColorFor(item.name),
            color: "#120d0c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "14px",
            flexShrink: 0,
          }}
        >
          {item.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "14px",
              color: "#f5f3f1",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
            <div
              style={{
                fontSize: "12px",
                color: "#a39c97",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.username || "No username saved."}
            </div>
            {item.username && (
              <CopyIconButton
                onCopy={() => onCopy(item.username)}
                title="Copy username"
                size={11}
                style={{ padding: "2px", flexShrink: 0 }}
              />
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        <span
          title={revealed ? item.password : undefined}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "14px",
            color: "#a39c97",
            letterSpacing: revealed ? "normal" : "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {revealed ? item.password : "••••••••"}
        </span>
        <button
          type="button"
          className="vault-icon-btn"
          onClick={() => setRevealed(!revealed)}
          title={revealed ? "Hide password" : "Reveal password"}
          style={{ flexShrink: 0 }}
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      <div style={{ fontSize: "12px", color: "#a39c97" }}>{formatRelativeTime(item.updatedAt)}</div>

      <CopyIconButton onCopy={() => onCopy(item.password)} title="Copy password" />

      <InteractiveHoverButton onClick={onEdit} compact>
        Edit
      </InteractiveHoverButton>
    </div>
  );
}
