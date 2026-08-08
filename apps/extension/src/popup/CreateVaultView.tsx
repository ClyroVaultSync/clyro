import React, { useState } from "react";

interface Props {
  onVaultCreated: () => void;
  onLogout: () => void;
}

export default function CreateVaultView({ onVaultCreated, onLogout }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Master password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await chrome.runtime.sendMessage({
        type: "CREATE_VAULT",
        masterPassword: password,
      });
      if (res.success) {
        onVaultCreated();
      } else {
        setError(res.error?.message || "Failed to create vault.");
      }
    } catch {
      setError("Communication error with background script.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await chrome.runtime.sendMessage({ type: "LOGOUT" });
    onLogout();
  };

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h2 style={{ margin: 0, textAlign: "center" }}>Create Vault</h2>
      <p
        style={{
          margin: 0,
          textAlign: "center",
          color: "#a0aec0",
          fontSize: "14px",
        }}
      >
        Create a Master Password for your new vault.
        <br />
        <br />
        <strong style={{ color: "#ef4444" }}>Warning:</strong> This password can
        never be recovered if forgotten. Our zero-knowledge architecture means
        we cannot reset it for you.
      </p>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <div>
          <input
            type="password"
            placeholder="Master Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px",
              boxSizing: "border-box",
              borderRadius: "4px",
              border: "1px solid #334155",
              background: "#1e293b",
              color: "white",
            }}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Confirm Master Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px",
              boxSizing: "border-box",
              borderRadius: "4px",
              border: "1px solid #334155",
              background: "#1e293b",
              color: "white",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px",
            background: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
            marginTop: "8px",
          }}
        >
          {loading ? "Creating..." : "Create Vault"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "16px" }}>
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "14px",
            textDecoration: "underline",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
