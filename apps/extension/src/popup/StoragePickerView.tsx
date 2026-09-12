import React, { useState } from "react";
import WheelPicker from "./WheelPicker";

interface Props {
  onProviderConnected: () => void;
}

const DEFAULT_LOCAL_URL = "http://localhost:8080";
const PROVIDER_ITEMS = ["Local Sync Server", "Google Drive", "Dropbox"];

type View = "choose" | "local-form" | "coming-soon";

export default function StoragePickerView({ onProviderConnected }: Props) {
  const [view, setView] = useState<View>("choose");
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

  const handleChoice = (index: number) => {
    setError("");
    setView(index === 0 ? "local-form" : "coming-soon");
  };

  if (view === "choose") {
    return (
      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          height: "540px",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ margin: 0, textAlign: "center" }}>Choose Your Storage</h2>
        <p style={{ margin: 0, textAlign: "center", color: "#a0aec0", fontSize: "14px" }}>
          Clyro has no account of its own. Pick where your encrypted vault should live — this can be
          changed later via encrypted export/import.
        </p>
        <WheelPicker items={PROVIDER_ITEMS} onConfirm={handleChoice} style={{ marginTop: "-48px" }} />
      </div>
    );
  }

  if (view === "coming-soon") {
    return (
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <h2 style={{ margin: 0, textAlign: "center" }}>Coming Soon</h2>
        <p style={{ margin: 0, textAlign: "center", color: "#a0aec0", fontSize: "14px" }}>
          This storage provider isn't available yet.
        </p>
        <button type="button" onClick={() => setView("choose")} style={linkButtonStyle}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ margin: 0, textAlign: "center" }}>Connect Local Sync Server</h2>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "12px", borderRadius: "6px", fontSize: "14px" }}>
          {error}
        </div>
      )}

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
        <button type="button" onClick={() => setView("choose")} style={linkButtonStyle}>
          Back
        </button>
      </form>
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
