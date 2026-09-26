import React, { useEffect, useState, useMemo } from "react";
import type { VaultItem } from "@clyro/shared-types";
import InteractiveHoverButton from "../popup/InteractiveHoverButton";
import VaultItemRow, { ROW_GRID_COLUMNS } from "./VaultItemRow";
import CredentialForm, { inputStyle, compactButtonWidth } from "./CredentialForm";
import { SearchIcon, ChevronDownIcon } from "./VaultIcons";
import "./VaultList.css";

interface Props {
  onLock: () => void;
}

/** Which screen the vault shows: the item list (null), or the credential form. */
type FormState = null | { mode: "add" } | { mode: "edit"; item: VaultItem };

export default function VaultList({ onLock }: Props) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<FormState>(null);

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

  /** Handles both Add (new id) and Edit (existing id) — applyChange() replaces by id. */
  const handleSave = async (item: VaultItem) => {
    if (!item.name || !item.url || !item.password) {
      setError("Name, URL, and Password are required.");
      return;
    }
    if (await saveChange({ upsert: [item] })) setForm(null);
  };

  const handleDelete = async (id: string) => {
    if (await saveChange({ deleteIds: [id] })) setForm(null);
  };

  /**
   * Sends the edit itself rather than the whole item list, so the background
   * worker can re-apply it to the newest vault if another device wrote first —
   * see applyVaultChange() in background/vaultManager.ts. Re-fetches either way,
   * so the list shows what is actually stored, including anything another device
   * added while this save was in flight. Resolves to whether the save succeeded,
   * so the form can stay open — keeping what the user typed — when it didn't.
   */
  const saveChange = async (change: { upsert?: VaultItem[]; deleteIds?: string[] }): Promise<boolean> => {
    setSaving(true);
    setError("");
    try {
      const res = await chrome.runtime.sendMessage({ type: "SAVE_VAULT_CHANGE", change });
      if (!res.success) setError(res.error?.message || "Failed to save.");
      await fetchItems(false);
      return Boolean(res.success);
    } catch {
      setError("Communication error while saving.");
      return false;
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

      {form ? (
        <CredentialForm
          key={form.mode === "edit" ? form.item.id : "new"}
          item={form.mode === "edit" ? form.item : undefined}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setForm(null)}
          onDelete={form.mode === "edit" ? () => handleDelete(form.item.id) : undefined}
        />
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
                filteredItems.map((item) => (
                  <VaultItemRow
                    key={item.id}
                    item={item}
                    onCopy={handleCopy}
                    onEdit={() => setForm({ mode: "edit", item })}
                  />
                ))
              )}
            </div>
          </div>

          <InteractiveHoverButton onClick={() => setForm({ mode: "add" })} disabled={loading}>
            Add Credential
          </InteractiveHoverButton>
        </>
      )}
    </div>
  );
}

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
