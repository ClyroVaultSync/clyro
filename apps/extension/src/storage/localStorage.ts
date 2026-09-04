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
