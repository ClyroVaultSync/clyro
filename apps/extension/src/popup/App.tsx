import React, { useEffect, useState } from "react";
import LoginView from "./LoginView";
import VaultUnlockView from "./VaultUnlockView";
import VaultList from "./VaultList";
import CreateVaultView from "./CreateVaultView";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [needsVaultCreation, setNeedsVaultCreation] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const authRes = await chrome.runtime.sendMessage({
        type: "GET_AUTH_STATUS",
      });
      if (authRes.success && authRes.data.authenticated) {
        setIsAuthenticated(true);

        const vaultExistsRes = await chrome.runtime.sendMessage({
          type: "GET_VAULT_EXISTS",
        });
        if (vaultExistsRes.success && !vaultExistsRes.data.exists) {
          setNeedsVaultCreation(true);
          setIsUnlocked(false);
        } else {
          setNeedsVaultCreation(false);
          const lockRes = await chrome.runtime.sendMessage({
            type: "GET_VAULT_LOCK_STATUS",
          });
          if (lockRes.success && lockRes.data.unlocked) {
            setIsUnlocked(true);
          } else {
            setIsUnlocked(false);
          }
        }
      } else {
        setIsAuthenticated(false);
        setIsUnlocked(false);
        setNeedsVaultCreation(false);
      }
    } catch (e) {
      console.error("Failed to get status", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={checkStatus} />;
  }

  if (needsVaultCreation) {
    return (
      <CreateVaultView onVaultCreated={checkStatus} onLogout={checkStatus} />
    );
  }

  if (!isUnlocked) {
    return (
      <VaultUnlockView onUnlockSuccess={checkStatus} onLogout={checkStatus} />
    );
  }

  return <VaultList onLock={checkStatus} />;
}
