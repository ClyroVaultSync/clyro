/**
 * Persistent storage (survives browser restarts). NEVER store the derived vault encryption key or master password here — see sessionStorage.ts for the vault key, which must remain memory-only per docs/SECURITY.md.
 */

export async function setAccessToken(token: string): Promise<void> {
  await chrome.storage.local.set({ accessToken: token });
}

export async function getAccessToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('accessToken');
  return result.accessToken || null;
}

export async function setRefreshToken(token: string): Promise<void> {
  await chrome.storage.local.set({ refreshToken: token });
}

export async function getRefreshToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('refreshToken');
  return result.refreshToken || null;
}

export async function clearAuthTokens(): Promise<void> {
  await chrome.storage.local.remove(['accessToken', 'refreshToken']);
}

export async function getOrCreateDeviceIdentifier(): Promise<string> {
  const result = await chrome.storage.local.get('deviceIdentifier');
  if (result.deviceIdentifier) {
    return result.deviceIdentifier;
  }
  const newIdentifier = crypto.randomUUID();
  await chrome.storage.local.set({ deviceIdentifier: newIdentifier });
  return newIdentifier;
}

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
  return result.cachedVault || null;
}

export async function clearCachedVaultBlob(): Promise<void> {
  await chrome.storage.local.remove('cachedVault');
}
