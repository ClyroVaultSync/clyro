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

/** Changes saved on this device that haven't reached the storage provider yet (background/syncQueue.ts). */
interface SyncStatus {
  pendingCount: number;
  lastError: string | null;
  providerId: "local" | "google-drive" | "dropbox" | null;
}

const PROVIDER_NAMES: Record<NonNullable<SyncStatus["providerId"]>, string> = {
  local: "the Local Sync Server",
  "google-drive": "Google Drive",
  dropbox: "Dropbox",
};

export default function VaultList({ onLock }: Props) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<FormState>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  const fetchSyncStatus = async () => {
    try {
      const res = await chrome.runtime.sendMessage({ type: "GET_SYNC_STATUS" });
      if (res.success) setSyncStatus(res.data);
    } catch {
      // Leave the last known status showing; a failed status check isn't worth an error banner.
    }
  };

  useEffect(() => {
    fetchItems();
    fetchSyncStatus();
  }, []);

  // The background worker announces every change to the queue, including syncs
  // this page didn't start (the retry alarm, a sync after a read elsewhere).
  useEffect(() => {
    const listener = (message: { type?: string }) => {
      if (message?.type === "SYNC_STATUS_CHANGED") fetchSyncStatus();
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await chrome.runtime.sendMessage({ type: "SYNC_NOW" });
      if (res.success) setSyncStatus(res.data);
    } catch {
      setError("Communication error while syncing.");
    } finally {
      setSyncing(false);
    }
  };

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
   * see applyVaultChange() in background/vaultManager.ts. A save the storage
   * provider couldn't receive still succeeds: it's kept on this device and the
   * sync notice above the list says so. Re-fetches either way, so the list shows
   * what is actually stored, including anything another device added while this
   * save was in flight. Resolves to whether the save succeeded, so the form can
   * stay open — keeping what the user typed — when it didn't.
   */
  const saveChange = async (change: { upsert?: VaultItem[]; deleteIds?: string[] }): Promise<boolean> => {
    setSaving(true);
    setError("");
    try {
      const res = await chrome.runtime.sendMessage({ type: "SAVE_VAULT_CHANGE", change });
      if (!res.success) setError(res.error?.message || "Failed to save.");
      await Promise.all([fetchItems(false), fetchSyncStatus()]);
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

      {syncStatus && syncStatus.pendingCount > 0 && (
        <SyncNotice status={syncStatus} syncing={syncing} onSyncNow={handleSyncNow} />
      )}

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

/**
 * Shown while changes are waiting to sync. Deliberately not the red error style:
 * the changes are safe on this device, and they sync by themselves once the
 * provider answers. `lastError` is why the latest attempt didn't go through.
 */
function SyncNotice({ status, syncing, onSyncNow }: { status: SyncStatus; syncing: boolean; onSyncNow: () => void }) {
  const changes = status.pendingCount === 1 ? "1 change" : `${status.pendingCount} changes`;
  const provider = status.providerId ? PROVIDER_NAMES[status.providerId] : "your storage provider";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        background: "#1a1210",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "10px 12px",
        borderRadius: "8px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "12px", color: "#f5f3f1" }}>
          {`${changes} saved on this device only, waiting for ${provider}.`}
        </div>
        {status.lastError && (
          <div style={{ fontSize: "11px", color: "#a39c97", marginTop: "2px" }}>{status.lastError}</div>
        )}
      </div>
      <div style={{ width: "160px", flexShrink: 0 }}>
        <InteractiveHoverButton onClick={onSyncNow} disabled={syncing} compact>
          {syncing ? "Syncing..." : "Sync now"}
        </InteractiveHoverButton>
      </div>
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
