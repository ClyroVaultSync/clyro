import React, { useState } from "react";
import type { VaultItem } from "@clyro/shared-types";
import InteractiveHoverButton from "../popup/InteractiveHoverButton";
import { ArrowLeftIcon } from "./VaultIcons";

interface Props {
  /** The item being edited. Absent means the form adds a new one. */
  item?: VaultItem;
  saving: boolean;
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
  /** Offered only when editing an existing item. */
  onDelete?: () => void;
}

/**
 * The Add Credential form, doubling as Edit Credential when given an `item`.
 * Builds the finished VaultItem and hands it to the caller — saving, and
 * reporting a failed save, stay with VaultList.
 */
export default function CredentialForm({ item, saving, onSave, onCancel, onDelete }: Props) {
  const [name, setName] = useState(item?.name ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [username, setUsername] = useState(item?.username ?? "");
  const [password, setPassword] = useState(item?.password ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();

    if (!item) {
      onSave({
        id: crypto.randomUUID(),
        name,
        url,
        username,
        password,
        notes: notes || undefined,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    // Saving an untouched item would still cost a full provider write (slow on
    // Drive/Dropbox) and bump "Last modified" for nothing — just close instead.
    const unchanged =
      name === item.name &&
      url === item.url &&
      username === item.username &&
      password === item.password &&
      notes === (item.notes ?? "");
    if (unchanged) {
      onCancel();
      return;
    }

    onSave({ ...item, name, url, username, password, notes: notes || undefined, updatedAt: now });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: "#1a1210",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <button
          type="button"
          className="vault-icon-btn"
          onClick={onCancel}
          disabled={saving}
          title="Back to vault"
          style={{ flexShrink: 0 }}
        >
          <ArrowLeftIcon size={18} />
        </button>
        <h2 style={{ margin: 0, fontSize: "16px", color: "#f5f3f1" }}>
          {item ? "Edit Credential" : "Add Credential"}
        </h2>
      </div>
      <input
        type="text"
        placeholder="Name (e.g. GitHub)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="URL (e.g. github.com)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="Username / Email (optional)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={inputStyle}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ ...inputStyle, flex: 1 }}
        />
        <div style={{ width: compactButtonWidth }}>
          <InteractiveHoverButton onClick={() => setShowPassword(!showPassword)} compact>
            {showPassword ? "Hide" : "Show"}
          </InteractiveHoverButton>
        </div>
      </div>
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        style={{ ...inputStyle, resize: "vertical" }}
      />

      {confirmingDelete && item ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
          <div style={{ fontSize: "13px", color: "#f5f3f1" }}>
            {`Delete "${item.name}" permanently? This can't be undone.`}
          </div>
          <div style={buttonRowStyle}>
            <div style={{ flex: 1 }}>
              <InteractiveHoverButton onClick={() => setConfirmingDelete(false)} disabled={saving}>
                Keep it
              </InteractiveHoverButton>
            </div>
            <div style={{ flex: 1 }}>
              <InteractiveHoverButton onClick={onDelete} disabled={saving} variant="danger">
                {saving ? "Deleting..." : "Yes, delete"}
              </InteractiveHoverButton>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...buttonRowStyle, marginTop: "8px" }}>
          <div style={{ flex: 1 }}>
            <InteractiveHoverButton onClick={onCancel} disabled={saving}>
              Cancel
            </InteractiveHoverButton>
          </div>
          {item && onDelete && (
            <div style={{ flex: 1 }}>
              <InteractiveHoverButton onClick={() => setConfirmingDelete(true)} disabled={saving} variant="danger">
                Delete
              </InteractiveHoverButton>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <InteractiveHoverButton type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </InteractiveHoverButton>
          </div>
        </div>
      )}
    </form>
  );
}

const buttonRowStyle = { display: "flex", gap: "8px" };

// Shared with VaultList (search box, Lock button) so the vault page's inputs
// and compact buttons stay consistent.
export const inputStyle = {
  width: "100%",
  padding: "10px",
  boxSizing: "border-box" as const,
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "#120d0c",
  color: "#f5f3f1",
};

export const compactButtonWidth = "100px";
