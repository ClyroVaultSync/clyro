import React, { useEffect, useState } from "react";
import StoragePickerView from "../popup/StoragePickerView";
import VaultUnlockView from "../popup/VaultUnlockView";
import CreateVaultView from "../popup/CreateVaultView";
import MainMenuView from "../popup/MainMenuView";
import VaultList from "./VaultList";

interface Props {
  /**
   * 'tab' (default, used by vault.html) keeps the original linear flow ending
   * in VaultList. 'popup' (used by the toolbar popup) ends in the OptionWheel
   * main menu instead — Open Vault from there opens this same component as a
   * 'tab'.
   */
  context?: "popup" | "tab";
}

/**
 * The whole storage-picker/create/unlock/list state machine — mounted both in
 * the popup and in the full-page vault.html tab that OPEN_VAULT opens. Same component, same
 * messages, diverging only at the tail end based on `context`.
 */
export default function VaultApp({ context = "tab" }: Props) {
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

  // Locking or disconnecting elsewhere (e.g. from the popup, while this vault.html
  // tab is still open) must drop whatever this tab has already decrypted into
  // `VaultList`'s state — otherwise the plaintext stays visible here indefinitely.
  // checkStatus() re-derives the right screen, unmounting VaultList (and its state
  // with it) whenever the vault is no longer unlocked and connected.
  useEffect(() => {
    const listener = (message: { type?: string }) => {
      if (message?.type === "VAULT_LOCKED") checkStatus();
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
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
    if (context === "popup") {
      return <MainMenuView isUnlocked={false} onStatusChange={checkStatus} />;
    }
    return <VaultUnlockView onUnlockSuccess={checkStatus} />;
  }

  if (context === "popup") {
    return <MainMenuView isUnlocked={true} onStatusChange={checkStatus} />;
  }
  return <VaultList onLock={checkStatus} />;
}
