import React, { useState } from "react";
import InteractiveHoverButton from "./InteractiveHoverButton";

interface Props {
  onVaultCreated: () => void;
}

export default function CreateVaultView({ onVaultCreated }: Props) {
  const [mode, setMode] = useState<"create" | "import">("create");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
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

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setError("Choose a .clyro export file.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fileContents = await importFile.text();
      const res = await chrome.runtime.sendMessage({
        type: "IMPORT_VAULT",
        fileContents,
        masterPassword: password,
      });
      if (res.success) {
        onVaultCreated();
      } else {
        setError(res.error?.message || "Failed to import vault.");
      }
    } catch {
      setError("Communication error with background script.");
    } finally {
      setLoading(false);
    }
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
      <h2 style={{ margin: 0, textAlign: "center" }}>{mode === "create" ? "Create Vault" : "Restore from Backup"}</h2>
      {mode === "create" ? (
        <p style={{ margin: 0, textAlign: "center", color: "#a0aec0", fontSize: "14px" }}>
          Create a Master Password for your new vault.
          <br />
          <br />
          <strong style={{ color: "#ef4444" }}>Warning:</strong> This password can
          never be recovered if forgotten. Our zero-knowledge architecture means
          we cannot reset it for you.
        </p>
      ) : (
        <p style={{ margin: 0, textAlign: "center", color: "#a0aec0", fontSize: "14px" }}>
          Choose a previously exported <code>.clyro</code> file and enter the master password it was
          exported with.
        </p>
      )}

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

      {mode === "create" ? (
        <form
          onSubmit={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <input
            type="password"
            placeholder="Master Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm Master Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <InteractiveHoverButton type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Vault"}
          </InteractiveHoverButton>
        </form>
      ) : (
        <form
          onSubmit={handleImport}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <input
            type="file"
            accept=".clyro,application/json"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            required
            style={{ color: "white" }}
          />
          <input
            type="password"
            placeholder="Master Password for this backup"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <InteractiveHoverButton type="submit" disabled={loading}>
            {loading ? "Restoring..." : "Restore Vault"}
          </InteractiveHoverButton>
        </form>
      )}

      <InteractiveHoverButton
        onClick={() => {
          setMode(mode === "create" ? "import" : "create");
          setError("");
        }}
      >
        {mode === "create" ? "Restore from a backup instead" : "Create a new vault instead"}
      </InteractiveHoverButton>
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
