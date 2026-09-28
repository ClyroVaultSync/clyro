import { deriveVaultKey, decryptVault, encryptVault, generateSalt } from '@clyro/crypto';
import { getVaultKey, setVaultKey, clearVaultKey } from '../storage/sessionStorage';
import { getCachedVaultBlob, setCachedVaultBlob } from '../storage/localStorage';
import { getActiveProvider } from '../providers';
import { NETWORK_ERROR, ProviderUnreachableError } from '../providers/errors';
import {
  readPendingChanges,
  writePendingChanges,
  clearPendingChanges,
  getSyncStatus,
  withSyncLock,
  cancelSyncRetry,
  type SyncStatus,
} from './syncQueue';
import type { SyncProvider, VaultItem, VaultData, VaultPayload } from '@clyro/shared-types';

/**
 * Creates a brand-new, empty vault on the active Storage Provider: generates the
 * (non-secret) vaultSalt, derives the key from the chosen master password,
 * encrypts an empty item list, and hands it to the provider. Required once
 * before unlockVault()/getVaultItems()/applyVaultChange() have anything to work
 * with. A CONFLICT means a vault already exists; the caller should route to
 * unlockVault() instead of retrying creation.
 */
export async function createVault(masterPassword: string): Promise<{ success: boolean; error?: string }> {
  const provider = await getActiveProvider();
  if (!provider) return { success: false, error: 'No storage provider configured.' };

  const vaultSalt = await generateSalt();
  const key = await deriveVaultKey(masterPassword, vaultSalt);
  const vaultData: VaultData = { items: [] };
  const encryptedVault = await encryptVault(key, JSON.stringify(vaultData));
  const vaultVersion = 1;

  const result = await provider.createVault({ encryptedVault, vaultSalt, vaultVersion });

  if (!result.success) {
    if (result.error.code === 'CONFLICT') {
      return { success: false, error: 'A vault already exists on this storage provider.' };
    }
    return { success: false, error: result.error.message || 'Failed to create vault.' };
  }

  await setCachedVaultBlob(encryptedVault, vaultVersion, vaultSalt);
  await setVaultKey(key);
  return { success: true };
}

/**
 * Attempts to unlock the vault with the given master password.
 * Fetches the vault from the active provider (falling back to the offline
 * cache if unreachable), derives the key from the password + vaultSalt, and
 * attempts to decrypt. A WRONG password is only detected here, via decryption
 * failure — Argon2id itself cannot detect a wrong password.
 */
export async function unlockVault(masterPassword: string): Promise<{ success: boolean; error?: string }> {
  let encryptedVault: string | null = null;
  let vaultSalt: string | null = null;

  const provider = await getActiveProvider();
  if (provider) {
    try {
      const vault = await provider.getVault();
      if (vault) {
        encryptedVault = vault.encryptedVault;
        vaultSalt = vault.vaultSalt;
        await setCachedVaultBlob(vault.encryptedVault, vault.vaultVersion, vault.vaultSalt);
      }
    } catch {
      // Provider unreachable — fall back to the offline cache below.
    }
  }

  if (!encryptedVault || !vaultSalt) {
    const cached = await getCachedVaultBlob();
    if (cached) {
      encryptedVault = cached.encryptedVault;
      vaultSalt = cached.vaultSalt;
    }
  }

  if (!encryptedVault || !vaultSalt) {
    return { success: false, error: 'No vault available. Connect to the Local Sync Server to unlock for the first time.' };
  }

  const key = await deriveVaultKey(masterPassword, vaultSalt);

  try {
    await decryptVault(key, encryptedVault);
  } catch {
    return { success: false, error: 'Incorrect master password.' };
  }

  await setVaultKey(key);
  // Changes saved while offline can only be sent with the key, so unlocking is
  // the first chance to send any left over from before the last lock.
  syncInBackground();
  return { success: true };
}

/**
 * Locks the vault by clearing the derived key from session storage.
 */
export async function lockVault(): Promise<void> {
  await clearVaultKey();
}

export async function isVaultUnlocked(): Promise<boolean> {
  const key = await getVaultKey();
  return key !== null;
}

/**
 * Whether a vault has ever been created on the active provider — distinguishes
 * "needs to create one" from "needs to unlock an existing one". SyncProvider
 * has no lightweight metadata call (§6 of docs/EXTENSION_HANDOFF.md), so this
 * fetches the full vault just to check existence; acceptable given vault size.
 * Falls back to the offline cache if the provider is unreachable.
 */
export async function vaultExists(): Promise<boolean> {
  const provider = await getActiveProvider();
  if (provider) {
    try {
      const vault = await provider.getVault();
      return vault !== null;
    } catch (error) {
      console.warn('vaultExists(): provider unreachable, falling back to cache.', error);
    }
  }

  const cached = await getCachedVaultBlob();
  return cached !== null;
}

/**
 * The vault's items as this device should show them: the provider's copy (or the
 * offline cache), with any changes still waiting to sync applied on top — so a
 * credential saved offline can be seen, copied, and autofilled straight away.
 */
export async function getVaultItems(): Promise<{ success: boolean; data?: VaultItem[]; error?: string }> {
  const key = await getVaultKey();
  if (!key) return { success: false, error: 'Vault is locked.' };

  let encryptedVault: string | null = null;
  let providerReachable = false;

  const provider = await getActiveProvider();
  if (provider) {
    try {
      const vault = await provider.getVault();
      providerReachable = true;
      if (vault) encryptedVault = vault.encryptedVault;
      else console.warn('getVaultItems(): provider reports no vault exists yet.');
    } catch (error) {
      console.warn('getVaultItems(): provider unreachable, falling back to cache.', error);
    }
  }

  if (!encryptedVault) {
    const cached = await getCachedVaultBlob();
    if (cached) {
      console.warn('getVaultItems(): using cached vault blob (version', cached.vaultVersion, ') instead of a live fetch.');
      encryptedVault = cached.encryptedVault;
    }
  }

  let items: VaultItem[] = [];
  if (encryptedVault) {
    try {
      items = await decryptItems(key, encryptedVault);
    } catch {
      return { success: false, error: 'Failed to decrypt vault contents.' };
    }
  }

  const pending = await readPendingChanges(key);
  // The provider just answered, so changes waiting on it can go now. Not awaited:
  // this read shouldn't pay for a write.
  if (pending.length > 0 && providerReachable) syncInBackground();

  return { success: true, data: pending.reduce(applyChange, items) };
}

async function decryptItems(key: Uint8Array, encryptedVault: string): Promise<VaultItem[]> {
  const vaultData = JSON.parse(await decryptVault(key, encryptedVault)) as VaultData;
  return vaultData.items || [];
}

/**
 * A single edit to the vault, expressed as intent rather than as a replacement
 * item list. This is what makes retrying a rejected write safe: re-sending a
 * whole array computed from a now-stale read would silently erase whatever
 * another device wrote in the meantime, whereas an intent can be re-applied to
 * freshly fetched state as many times as needed. See docs/ARCHITECTURE.md
 * "Conflict Resolution".
 */
export interface VaultChange {
  upsert?: VaultItem[];
  deleteIds?: string[];
}

/**
 * How many times a write is re-attempted against freshly fetched state before
 * giving up. Conflicts are expected to be rare in single-user, few-device use
 * (docs/PRD.md), so a handful of attempts covers genuine races without letting
 * a persistently contended vault spin.
 */
const MAX_SAVE_ATTEMPTS = 3;

/**
 * Applies a VaultChange to an item list. Pure — no I/O, no crypto — so the
 * merge rules stay directly testable. Deletes run first so that deleting and
 * re-adding the same id in one change ends with the item present.
 */
export function applyChange(items: VaultItem[], change: VaultChange): VaultItem[] {
  let next = items;

  if (change.deleteIds?.length) {
    const doomed = new Set(change.deleteIds);
    next = next.filter((item) => !doomed.has(item.id));
  }

  for (const incoming of change.upsert || []) {
    const index = next.findIndex((item) => item.id === incoming.id);
    next = index === -1 ? [...next, incoming] : next.map((item, i) => (i === index ? incoming : item));
  }

  return next;
}

/**
 * Saves a change. It goes into the offline write queue first (syncQueue.ts), so
 * it's stored before any network call, and then everything queued is sent.
 *
 * - Sent: `synced: true`.
 * - The provider couldn't be reached: still a success, with `synced: false`. The
 *   change stays queued, is already visible through getVaultItems(), and goes out
 *   on a later sync (docs/ARCHITECTURE.md "Offline Synchronization").
 * - Any other failure takes back just this change and reports the error, so the
 *   caller can keep the user's input; changes queued earlier stay queued.
 */
export async function applyVaultChange(change: VaultChange): Promise<{ success: boolean; synced?: boolean; error?: string }> {
  const key = await getVaultKey();
  if (!key) return { success: false, error: 'Vault is locked.' };

  const provider = await getActiveProvider();
  if (!provider) return { success: false, error: 'No storage provider configured.' };

  return withSyncLock(async () => {
    const queued = [...(await readPendingChanges(key)), change];
    await writePendingChanges(key, queued, null);

    const outcome = await sendChanges(key, provider, queued);
    if (outcome.status === 'failed') {
      await writePendingChanges(key, queued.slice(0, -1), outcome.error);
      return { success: false, error: outcome.error };
    }

    await recordOutcome(key, queued, outcome);
    return { success: true, synced: outcome.status === 'synced' };
  });
}

/**
 * Sends whatever is waiting in the queue — the path for every sync that isn't a
 * save: unlocking, the provider answering a read, the retry alarm, and "Sync
 * now". Both the queue and the vault need the key, so nothing can be sent while
 * the vault is locked; the retry alarm stops instead, and the next unlock picks
 * the queue back up.
 */
export async function syncPendingChanges(): Promise<SyncStatus> {
  return withSyncLock(async () => {
    const key = await getVaultKey();
    if (!key) {
      cancelSyncRetry();
      return getSyncStatus();
    }

    const provider = await getActiveProvider();
    const changes = await readPendingChanges(key);
    if (provider && changes.length > 0) {
      await recordOutcome(key, changes, await sendChanges(key, provider, changes));
    }
    return getSyncStatus();
  });
}

/** For triggers that shouldn't wait on the network. The queue records the outcome either way. */
function syncInBackground(): void {
  syncPendingChanges().catch((error) => console.warn('syncPendingChanges(): background sync failed.', error));
}

/**
 * The vault blob with any changes still waiting to sync applied, re-encrypted —
 * so a backup exported while offline isn't missing them.
 */
export async function withPendingChanges(key: Uint8Array, encryptedVault: string): Promise<string> {
  const pending = await readPendingChanges(key);
  if (pending.length === 0) return encryptedVault;

  const vaultData: VaultData = { items: pending.reduce(applyChange, await decryptItems(key, encryptedVault)) };
  return encryptVault(key, JSON.stringify(vaultData));
}

type SendOutcome = { status: 'synced' } | { status: 'unreachable'; error: string } | { status: 'failed'; error: string };

/** Empties the queue once it's sent; otherwise keeps it, with the reason, which also schedules a retry. */
async function recordOutcome(key: Uint8Array, changes: VaultChange[], outcome: SendOutcome): Promise<void> {
  if (outcome.status === 'synced') await clearPendingChanges();
  else await writePendingChanges(key, changes, outcome.error);
}

/**
 * Applies the changes, in order, to the vault as the provider holds it right now
 * and writes the result back as one new version, re-fetching and re-applying on
 * a version conflict rather than surfacing one (docs/API.md "the extension
 * re-fetches and retries").
 *
 * Every attempt starts from a fresh read, never the cache, so another device's
 * concurrent additions always survive — this never writes back an item list
 * assembled from a stale read. It decrypts the stored vault before replacing it,
 * so a vault encrypted under a different master password is refused instead of
 * overwritten. And because the changes are intents, sending the same ones twice
 * (the worker stopping after the write but before the queue was cleared) is
 * harmless.
 */
async function sendChanges(key: Uint8Array, provider: SyncProvider, changes: VaultChange[]): Promise<SendOutcome> {
  for (let attempt = 1; attempt <= MAX_SAVE_ATTEMPTS; attempt++) {
    let current: VaultPayload | null;
    try {
      current = await provider.getVault();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read the vault.';
      return { status: error instanceof ProviderUnreachableError ? 'unreachable' : 'failed', error: message };
    }

    let currentItems: VaultItem[] = [];
    if (current) {
      try {
        currentItems = await decryptItems(key, current.encryptedVault);
      } catch {
        return { status: 'failed', error: 'Failed to decrypt vault contents.' };
      }
    }

    let encryptedVault: string;
    try {
      const vaultData: VaultData = { items: changes.reduce(applyChange, currentItems) };
      encryptedVault = await encryptVault(key, JSON.stringify(vaultData));
    } catch {
      return { status: 'failed', error: 'Encryption failed.' };
    }

    const vaultVersion = (current?.vaultVersion ?? 0) + 1;
    const result = await provider.updateVault({ encryptedVault, vaultVersion });

    if (result.success) {
      // Every provider stores exactly what it was sent, so the cache can take this
      // without downloading it again.
      if (current) await setCachedVaultBlob(encryptedVault, vaultVersion, current.vaultSalt);
      return { status: 'synced' };
    }

    if (result.error.code === NETWORK_ERROR) return { status: 'unreachable', error: result.error.message };
    if (result.error.code !== 'CONFLICT') return { status: 'failed', error: result.error.message || 'Failed to save vault.' };

    console.warn(`sendChanges(): version conflict on attempt ${attempt}, re-fetching and retrying.`);
  }

  return {
    status: 'failed',
    error: 'Sync conflict: the vault kept changing elsewhere while saving. Please refresh and try again.',
  };
}
