import React, { useEffect, useState } from "react";
import InteractiveHoverButton from "../popup/InteractiveHoverButton";
import { getDisconnectWarning } from "../popup/disconnectWarning";
import "./OptionsApp.css";

interface SetupState {
  providerId: "local" | "google-drive" | "dropbox" | null;
  baseUrl: string | null;
}

const PROVIDER_LABELS: Record<NonNullable<SetupState["providerId"]>, string> = {
  local: "Local Sync Server",
  "google-drive": "Google Drive",
  dropbox: "Dropbox",
};

export function OptionsApp() {
  const [state, setState] = useState<SetupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chrome.runtime.sendMessage({ type: "GET_SETUP_STATE" });
      if (!res.success) throw new Error(res.error?.message || "Failed to fetch storage status");
      setState(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleDisconnect = async () => {
    if (!window.confirm(await getDisconnectWarning())) return;
    setLoading(true);
    try {
      const res = await chrome.runtime.sendMessage({ type: "CLEAR_PROVIDER" });
      if (!res.success) throw new Error(res.error?.message || "Failed to disconnect");
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await chrome.runtime.sendMessage({ type: "EXPORT_VAULT" });
      if (!res.success) throw new Error(res.error?.message || "Failed to export vault");

      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clyro-vault-${new Date().toISOString().slice(0, 10)}.clyro`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="options-container">
      <div className="options-header">
        <h1 className="options-title">Clyro Settings</h1>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="error-dismiss" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading your storage settings...</div>
      ) : (
        <div className="section">
          <h2 className="section-title">Storage &amp; Sync</h2>
          <div className="list-container">
            <div className="list-item">
              <div className="item-info">
                <span className="item-name">
                  {state?.providerId ? PROVIDER_LABELS[state.providerId] : "Not connected"}
                </span>
                {state?.baseUrl && <span className="item-meta">{state.baseUrl}</span>}
              </div>
              {state?.providerId && (
                <div style={{ width: "160px" }}>
                  <InteractiveHoverButton onClick={handleDisconnect} compact>
                    Disconnect
                  </InteractiveHoverButton>
                </div>
              )}
            </div>
          </div>

          {state?.providerId && (
            <div style={{ marginTop: "16px" }}>
              <InteractiveHoverButton onClick={handleExport} disabled={exporting}>
                {exporting ? "Exporting..." : "Export Encrypted Vault (.clyro)"}
              </InteractiveHoverButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
