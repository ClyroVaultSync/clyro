import React, { useEffect, useState } from "react";
import "./OptionsApp.css";

interface TrustedDevice {
  id: string;
  deviceName: string;
  platform: string;
  browser: string;
  lastSeenAt: string;
}

interface UserSession {
  id: string;
  deviceId: string;
  deviceName: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

export function OptionsApp() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [devicesRes, sessionsRes] = await Promise.all([
        chrome.runtime.sendMessage({ type: "GET_DEVICES" }),
        chrome.runtime.sendMessage({ type: "GET_SESSIONS" }),
      ]);

      if (!devicesRes.success) {
        throw new Error(devicesRes.error?.message || "Failed to fetch devices");
      }
      if (!sessionsRes.success) {
        throw new Error(
          sessionsRes.error?.message || "Failed to fetch sessions",
        );
      }

      setDevices(devicesRes.data?.devices || []);
      setSessions(sessionsRes.data?.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevokeDevice = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke this device?")) return;
    setLoading(true);
    try {
      const res = await chrome.runtime.sendMessage({
        type: "REVOKE_DEVICE",
        deviceId: id,
      });
      if (!res.success)
        throw new Error(res.error?.message || "Failed to revoke device");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke this session?"))
      return;
    setLoading(true);
    try {
      const res = await chrome.runtime.sendMessage({
        type: "REVOKE_SESSION",
        sessionId: id,
      });
      if (!res.success)
        throw new Error(res.error?.message || "Failed to revoke session");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to log out from all devices? This will also log you out of this session.",
      )
    )
      return;
    setLoading(true);
    try {
      const res = await chrome.runtime.sendMessage({ type: "LOGOUT_ALL" });
      if (!res.success)
        throw new Error(
          res.error?.message || "Failed to logout from all devices",
        );
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="options-container">
      <div className="options-header">
        <h1 className="options-title">Clyro Settings</h1>
        <button className="logout-all-btn" onClick={handleLogoutAll}>
          Logout Everywhere
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="error-dismiss" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {loading && devices.length === 0 && sessions.length === 0 ? (
        <div className="loading-state">Loading your security settings...</div>
      ) : (
        <>
          <div className="section">
            <h2 className="section-title">Trusted Devices</h2>
            <div className="list-container">
              {devices.length === 0 ? (
                <div className="empty-state">No trusted devices found.</div>
              ) : (
                devices.map((device) => (
                  <div key={device.id} className="list-item">
                    <div className="item-info">
                      <span className="item-name">{device.deviceName}</span>
                      <span className="item-meta">
                        {device.platform} • {device.browser} • Last seen:{" "}
                        {new Date(device.lastSeenAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      className="revoke-btn"
                      onClick={() => handleRevokeDevice(device.id)}
                    >
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">Active Sessions</h2>
            <div className="list-container">
              {sessions.length === 0 ? (
                <div className="empty-state">No active sessions found.</div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="list-item">
                    <div className="item-info">
                      <span className="item-name">{session.deviceName}</span>
                      <span className="item-meta">
                        Created: {new Date(session.createdAt).toLocaleString()}{" "}
                        • Last active:{" "}
                        {new Date(session.lastActivityAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      className="revoke-btn"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
