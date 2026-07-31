/**
 * Session-only storage (chrome.storage.session): memory-backed, NEVER written to disk, automatically cleared when the browser fully closes. Survives MV3 service worker restarts, unlike a plain in-memory variable, which is why this is used instead of just holding the key in a module-level variable. This is the ONLY place the derived vault encryption key may be held. Per docs/SECURITY.md, this key must be discarded when the vault is locked or the session ends — always call clearVaultKey() in those cases.
 */

export async function setVaultKey(key: Uint8Array): Promise<void> {
  const keyArray = Array.from(key);
  await chrome.storage.session.set({ vaultKey: keyArray });
}

export async function getVaultKey(): Promise<Uint8Array | null> {
  const result = await chrome.storage.session.get('vaultKey');
  if (result.vaultKey && Array.isArray(result.vaultKey)) {
    return new Uint8Array(result.vaultKey);
  }
  return null;
}

export async function clearVaultKey(): Promise<void> {
  await chrome.storage.session.remove('vaultKey');
}
