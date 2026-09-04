import React, { useEffect, useState } from "react";
import StoragePickerView from "../popup/StoragePickerView";
import VaultUnlockView from "../popup/VaultUnlockView";
import CreateVaultView from "../popup/CreateVaultView";
import VaultList from "./VaultList";

/**
 * The whole storage-picker/create/unlock/list state machine, per
 * docs/EXTENSION_HANDOFF.md §8 step 4 — mounted both in the popup and in the
 * full-page vault.html tab that OPEN_VAULT opens. Same component, same
 * messages, two different HTML shells.
 */
export default function VaultApp() {
  const [loading, setLoading] = useState(true);
  const [hasProvider, setHasProvider] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [needsVaultCreation, setNeedsVaultCreation] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const setupRes = await chrome.runtime.sendMessage({ type: "GET_SETUP_STATE" });
      if (setupRes.success && setupRes.data?.providerId) {
        setHasProvider(true);

        const vaultExistsRes = await chrome.runtime.sendMessage({ type: "GET_VAULT_EXISTS" });
        if (vaultExistsRes.success && !vaultExistsRes.data.exists) {
          setNeedsVaultCreation(true);
          setIsUnlocked(false);
        } else {
          setNeedsVaultCreation(false);
          const lockRes = await chrome.runtime.sendMessage({ type: "GET_VAULT_LOCK_STATUS" });
          setIsUnlocked(Boolean(lockRes.success && lockRes.data.unlocked));
        }
      } else {
        setHasProvider(false);
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
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>;
  }

  if (!hasProvider) {
    return <StoragePickerView onProviderConnected={checkStatus} />;
  }

  if (needsVaultCreation) {
    return <CreateVaultView onVaultCreated={checkStatus} />;
  }

  if (!isUnlocked) {
    return <VaultUnlockView onUnlockSuccess={checkStatus} />;
  }

  return <VaultList onLock={checkStatus} />;
}
