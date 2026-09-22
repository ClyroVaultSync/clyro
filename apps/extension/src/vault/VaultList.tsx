import React, { useEffect, useState, useMemo } from "react";
import type { VaultItem } from "@clyro/shared-types";
import InteractiveHoverButton from "../popup/InteractiveHoverButton";
import VaultItemRow, { ROW_GRID_COLUMNS } from "./VaultItemRow";
import { SearchIcon, ChevronDownIcon, ArrowLeftIcon } from "./VaultIcons";
import "./VaultList.css";

interface Props {
  onLock: () => void;
}

export default function VaultList({ onLock }: Props) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Credential Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  /** `showSpinner: false` is for refreshes that happen behind an action the user already
   * sees feedback for (a save), where swapping the list for "Loading items..." would read
   * as a glitch rather than as progress. */
  const fetchItems = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await chrome.runtime.sendMessage({ type: "GET_VAULT_ITEMS" });
      if (res.success) {
        setItems(res.data || []);
      } else {
        setError(res.error?.message || "Failed to fetch items.");
      }
    } catch {
      setError("Communication error.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleLock = async () => {
    await chrome.runtime.sendMessage({ type: "LOCK_VAULT" });
    onLock();
  };

  const handleCopy = async (text: string) => {
    if (!text) return;
    // Routed through the background/offscreen document rather than calling
    // navigator.clipboard directly: writeText() can resolve successfully from
    // inside the action popup without actually reaching the OS clipboard, a
    // known Chromium quirk for that window type (see src/offscreen/offscreen.ts).
    const res = await chrome.runtime.sendMessage({ type: "COPY_TO_CLIPBOARD", text });
    if (!res.success) setError(res.error?.message || "Failed to copy to clipboard.");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl || !newPassword) {
      setError("Name, URL, and Password are required.");
      return;
    }

    const newItem: VaultItem = {
      id: crypto.randomUUID(),
      name: newName,
      url: newUrl,
      username: newUsername,
      password: newPassword,
      notes: newNotes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setItems([...items, newItem]);
    await saveChange({ upsert: [newItem] });

    setShowAddForm(false);
    setNewName("");
    setNewUrl("");
    setNewUsername("");
    setNewPassword("");
    setNewNotes("");
    setShowNewPassword(false);
  };

  /**
   * Sends the edit itself rather than the whole item list, so the background
   * worker can re-apply it to the newest vault if another device wrote first —
   * see applyVaultChange() in background/vaultManager.ts. Re-fetches either way:
   * on failure to drop the optimistic update, on success to pick up anything
   * another device added while this save was in flight.
   */
  const saveChange = async (change: { upsert?: VaultItem[]; deleteIds?: string[] }) => {
    setSaving(true);
    setError("");
    try {
      const res = await chrome.runtime.sendMessage({ type: "SAVE_VAULT_CHANGE", change });
      if (!res.success) setError(res.error?.message || "Failed to save.");
      await fetchItems(false);
    } catch {
      setError("Communication error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const lowerQ = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQ) ||
        item.username.toLowerCase().includes(lowerQ) ||
        (item.url && item.url.toLowerCase().includes(lowerQ)),
    );
  }, [items, searchQuery]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "24px",
        boxSizing: "border-box",
        gap: "20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "1.5px",
              color: "#a39c97",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Clyro
          </div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#f5f3f1" }}>My Vault</h1>
        </div>
        <div style={{ width: compactButtonWidth }}>
          <InteractiveHoverButton onClick={handleLock} compact>
            Lock
          </InteractiveHoverButton>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "10px 12px",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {showAddForm ? (
        <form
          onSubmit={handleAddSubmit}
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
              onClick={() => setShowAddForm(false)}
              title="Back to vault"
              style={{ flexShrink: 0 }}
            >
              <ArrowLeftIcon size={18} />
            </button>
            <h2 style={{ margin: 0, fontSize: "16px", color: "#f5f3f1" }}>Add Credential</h2>
          </div>
          <input
            type="text"
            placeholder="Name (e.g. GitHub)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="URL (e.g. github.com)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Username / Email (optional)"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ ...inputStyle, flex: 1 }}
            />
            <div style={{ width: compactButtonWidth }}>
              <InteractiveHoverButton onClick={() => setShowNewPassword(!showNewPassword)} compact>
                {showNewPassword ? "Hide" : "Show"}
              </InteractiveHoverButton>
            </div>
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <div style={{ flex: 1 }}>
              <InteractiveHoverButton onClick={() => setShowAddForm(false)}>Cancel</InteractiveHoverButton>
            </div>
            <div style={{ flex: 1 }}>
              <InteractiveHoverButton type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </InteractiveHoverButton>
            </div>
          </div>
        </form>
      ) : (
        <>
          <div
            style={{
              background: "#1a1210",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  color: "#a39c97",
                  textTransform: "uppercase",
                }}
              >
                All Items
              </div>
              <div style={{ position: "relative", width: "200px" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#a39c97",
                    display: "flex",
                    pointerEvents: "none",
                  }}
                >
                  <SearchIcon size={14} />
                </span>
                <input
                  type="text"
                  className="vault-search-input"
                  placeholder="Search vault..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={searchInputStyle}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: ROW_GRID_COLUMNS,
                gap: "8px",
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={columnHeaderStyle}>Item Name</div>
              <div style={columnHeaderStyle}>Password</div>
              <div style={{ ...columnHeaderStyle, display: "flex", alignItems: "center", gap: "4px" }}>
                Last Modified <ChevronDownIcon size={11} />
              </div>
              <div />
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#a39c97" }}>Loading items...</div>
              ) : filteredItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#a39c97" }}>
                  {items.length === 0 ? "Vault is empty." : "No results found."}
                </div>
              ) : (
                filteredItems.map((item) => <VaultItemRow key={item.id} item={item} onCopy={handleCopy} />)
              )}
            </div>
          </div>

          <InteractiveHoverButton onClick={() => setShowAddForm(true)} disabled={loading}>
            Add Credential
          </InteractiveHoverButton>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  boxSizing: "border-box" as const,
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "#120d0c",
  color: "#f5f3f1",
};

const searchInputStyle = {
  ...inputStyle,
  padding: "8px 10px 8px 32px",
  fontSize: "13px",
};

const columnHeaderStyle = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.5px",
  color: "#a39c97",
  textTransform: "uppercase" as const,
};

const compactButtonWidth = "100px";
