import React, { useState } from "react";

interface Props {
  onProviderConnected: () => void;
}

const DEFAULT_LOCAL_URL = "http://localhost:8080";

export default function StoragePickerView({ onProviderConnected }: Props) {
  const [showLocalForm, setShowLocalForm] = useState(false);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_LOCAL_URL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnectLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await chrome.runtime.sendMessage({
        type: "SET_LOCAL_PROVIDER",
        baseUrl: baseUrl.replace(/\/+$/, ""),
      });
      if (res.success) {
        onProviderConnected();
      } else {
        setError(res.error?.message || "Failed to connect to the Local Sync Server.");
      }
    } catch {
      setError("Communication error with background script.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ margin: 0, textAlign: "center" }}>Choose Your Storage</h2>
      <p style={{ margin: 0, textAlign: "center", color: "#a0aec0", fontSize: "14px" }}>
        Clyro has no account of its own. Pick where your encrypted vault should live — this can be
        changed later via encrypted export/import.
      </p>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "12px", borderRadius: "6px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {showLocalForm ? (
        <form onSubmit={handleConnectLocal} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="text"
            placeholder="Local Sync Server URL"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? "Connecting..." : "Connect"}
          </button>
          <button type="button" onClick={() => setShowLocalForm(false)} style={linkButtonStyle}>
            Back
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={() => setShowLocalForm(true)} style={optionButtonStyle}>
            Local Sync Server
          </button>
          <button disabled style={disabledOptionButtonStyle} title="Coming soon">
            Google Drive
          </button>
          <button disabled style={disabledOptionButtonStyle} title="Coming soon">
            Dropbox
          </button>
        </div>
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

const primaryButtonStyle = {
  padding: "10px",
  background: "#6366f1",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: 600,
};

const linkButtonStyle = {
  background: "transparent",
  border: "none",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: "14px",
  textDecoration: "underline",
};

const optionButtonStyle = {
  padding: "12px",
  background: "#1e293b",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: 600,
  textAlign: "left" as const,
};

const disabledOptionButtonStyle = {
  ...optionButtonStyle,
  color: "#64748b",
  cursor: "not-allowed",
};
