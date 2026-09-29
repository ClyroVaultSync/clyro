import React, { useState } from "react";
import WheelPicker from "./WheelPicker";
import InteractiveHoverButton from "./InteractiveHoverButton";

interface Props {
  onProviderConnected: () => void;
}

const DEFAULT_LOCAL_URL = "http://localhost:47821";
const PROVIDER_ITEMS = ["Local Sync Server", "Google Drive", "Dropbox"];

type View = "choose" | "local-form" | "connecting-google-drive" | "connecting-dropbox";

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

  const handleConnectGoogleDrive = async () => {
    setView("connecting-google-drive");
    setError("");

    try {
      const res = await chrome.runtime.sendMessage({ type: "CONNECT_GOOGLE_DRIVE" });
      if (res.success) {
        onProviderConnected();
      } else {
        setError(res.error?.message || "Failed to connect to Google Drive.");
        setView("choose");
      }
    } catch {
      setError("Communication error with background script.");
      setView("choose");
    }
  };

  const handleConnectDropbox = async () => {
    setView("connecting-dropbox");
    setError("");

    try {
      const res = await chrome.runtime.sendMessage({ type: "CONNECT_DROPBOX" });
      if (res.success) {
        onProviderConnected();
      } else {
        setError(res.error?.message || "Failed to connect to Dropbox.");
        setView("choose");
      }
    } catch {
      setError("Communication error with background script.");
      setView("choose");
    }
  };

  const handleChoice = (index: number) => {
    setError("");
    if (index === 0) {
      setView("local-form");
    } else if (index === 1) {
      handleConnectGoogleDrive();
    } else {
      handleConnectDropbox();
    }
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
        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "12px", borderRadius: "6px", fontSize: "14px" }}>
            {error}
          </div>
        )}
        <WheelPicker items={PROVIDER_ITEMS} onConfirm={handleChoice} style={{ marginTop: "-48px" }} />
      </div>
    );
  }

  if (view === "connecting-google-drive") {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Connecting to Google Drive...
      </div>
    );
  }

  if (view === "connecting-dropbox") {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Connecting to Dropbox...
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
        <InteractiveHoverButton type="submit" disabled={loading}>
          {loading ? "Connecting..." : "Connect"}
        </InteractiveHoverButton>
        <InteractiveHoverButton onClick={() => setView("choose")}>Back</InteractiveHoverButton>
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
