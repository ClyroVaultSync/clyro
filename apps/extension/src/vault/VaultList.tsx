import React, { useEffect, useState, useMemo } from "react";
import type { VaultItem } from "@clyro/shared-types";

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

  const fetchItems = async () => {
    setLoading(true);
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
      setLoading(false);
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

    const newItems = [...items, newItem];
    setItems(newItems);
    await saveItems(newItems);

    setShowAddForm(false);
    setNewName("");
    setNewUrl("");
    setNewUsername("");
    setNewPassword("");
    setNewNotes("");
    setShowNewPassword(false);
  };

  const saveItems = async (itemsToSave: VaultItem[]) => {
    setSaving(true);
    setError("");
    try {
      const res = await chrome.runtime.sendMessage({
        type: "SAVE_VAULT_ITEMS",
        items: itemsToSave,
      });
      if (!res.success) {
        setError(res.error?.message || "Failed to save.");
        fetchItems(); // revert to server state
      }
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
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ margin: 0 }}>My Vault</h3>
        <button
          onClick={handleLock}
          style={{
            background: "#334155",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Lock
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
            padding: "8px",
            borderRadius: "4px",
            fontSize: "12px",
            marginBottom: "12px",
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
            overflowY: "auto",
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
            Add Credential
          </h4>
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
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={iconBtnStyle}
            >
              {showNewPassword ? "Hide" : "Show"}
            </button>
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                flex: 1,
                padding: "10px",
                background: "transparent",
                color: "#94a3b8",
                border: "1px solid #475569",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: "10px",
                background: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div style={{ marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="Search vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#94a3b8",
                }}
              >
                Loading items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#94a3b8",
                }}
              >
                {items.length === 0 ? "Vault is empty." : "No results found."}
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#1e293b",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #334155",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>
                    {item.name}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      User: {item.username}
                    </div>
                    <button
                      onClick={() => handleCopy(item.username)}
                      style={copyBtnStyle}
                      title="Copy Username"
                    >
                      Copy
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                      Pass: ••••••••
                    </div>
                    {item.password && (
                      <button
                        onClick={() => handleCopy(item.password!)}
                        style={copyBtnStyle}
                        title="Copy Password"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: "16px" }}>
            <button
              onClick={() => setShowAddForm(true)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                background: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              + Add Credential
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  boxSizing: "border-box" as const,
  borderRadius: "4px",
  border: "1px solid #334155",
  background: "#1e293b",
  color: "white",
};

const iconBtnStyle = {
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: "4px",
  padding: "0 12px",
  cursor: "pointer",
  fontSize: "12px",
};

const copyBtnStyle = {
  background: "transparent",
  color: "#6366f1",
  border: "1px solid #6366f1",
  borderRadius: "4px",
  padding: "2px 8px",
  cursor: "pointer",
  fontSize: "11px",
  marginLeft: "8px",
};
