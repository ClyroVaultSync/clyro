/**
 * Persistent storage (survives browser restarts). NEVER store the derived vault encryption key or master password here — see sessionStorage.ts for the vault key, which must remain memory-only per docs/SECURITY.md.
 */

export async function setCachedVaultBlob(encryptedVault: string, vaultVersion: number, vaultSalt: string): Promise<void> {
  await chrome.storage.local.set({
    cachedVault: {
      encryptedVault,
      vaultVersion,
      vaultSalt,
    },
  });
}

export async function getCachedVaultBlob(): Promise<{ encryptedVault: string; vaultVersion: number; vaultSalt: string } | null> {
  const result = await chrome.storage.local.get('cachedVault');
  return (result.cachedVault as { encryptedVault: string; vaultVersion: number; vaultSalt: string }) || null;
}

export async function clearCachedVaultBlob(): Promise<void> {
  await chrome.storage.local.remove('cachedVault');
}

/**
 * Vault changes saved while the storage provider was unreachable, not yet sent.
 * `encryptedChanges` is encrypted with the vault key (see background/syncQueue.ts)
 * and is the only copy of those changes until they sync. `count` and `lastError`
 * are deliberately left readable — neither is secret — so the "waiting to sync"
 * notice can be shown without the vault key.
 */
export interface PendingChangesRecord {
  encryptedChanges: string;
  count: number;
  lastError: string | null;
}

export async function setPendingChangesRecord(record: PendingChangesRecord): Promise<void> {
  await chrome.storage.local.set({ pendingChanges: record });
}

export async function getPendingChangesRecord(): Promise<PendingChangesRecord | null> {
  const result = await chrome.storage.local.get('pendingChanges');
  return (result.pendingChanges as PendingChangesRecord) || null;
}

export async function clearPendingChangesRecord(): Promise<void> {
  await chrome.storage.local.remove('pendingChanges');
}
