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

export interface PendingCredential {
  url: string;
  username: string;
  password: string;
  detectedAt: number;
}

// A real <form> submit starts navigating to the next page immediately, well before an
// async "is this new?" round-trip to the background worker could resolve — so that check
// can't happen (or be shown) on the page being submitted. Instead the content script stashes
// the raw credential here the instant it's submitted, and whichever page loads next asks for
// it and decides then. The TTL guards against a stale stash surfacing on an unrelated later
// page if the submitting tab never finished navigating (e.g. the user closed it).
const PENDING_CREDENTIAL_TTL_MS = 30_000;

export async function setPendingCredential(item: Omit<PendingCredential, 'detectedAt'>): Promise<void> {
  await chrome.storage.session.set({ pendingCredential: { ...item, detectedAt: Date.now() } });
}

/** Reads and clears the stash in one step, so a slow follow-up page can't see the same pending credential twice. */
export async function takePendingCredential(): Promise<PendingCredential | null> {
  const result = await chrome.storage.session.get('pendingCredential');
  await chrome.storage.session.remove('pendingCredential');
  const pending = result.pendingCredential as PendingCredential | undefined;
  if (!pending || Date.now() - pending.detectedAt > PENDING_CREDENTIAL_TTL_MS) return null;
  return pending;
}
