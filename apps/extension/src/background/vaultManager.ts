import { deriveVaultKey, decryptVault, encryptVault, generateSalt } from '@clyro/crypto';
import { getVaultKey, setVaultKey, clearVaultKey } from '../storage/sessionStorage';
import { getCachedVaultBlob, setCachedVaultBlob } from '../storage/localStorage';
import { getActiveProvider } from '../providers';
import type { SyncProvider, VaultItem, VaultData } from '@clyro/shared-types';

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
    await setVaultKey(key);
    return { success: true };
  } catch {
    return { success: false, error: 'Incorrect master password.' };
  }
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

export async function getVaultItems(): Promise<{ success: boolean; data?: VaultItem[]; error?: string }> {
  const key = await getVaultKey();
  if (!key) return { success: false, error: 'Vault is locked.' };

  let encryptedVault: string | null = null;

  const provider = await getActiveProvider();
  if (provider) {
    try {
      const vault = await provider.getVault();
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

  if (!encryptedVault) return { success: true, data: [] };

  try {
    const decrypted = await decryptVault(key, encryptedVault);
    const vaultData = JSON.parse(decrypted) as VaultData;
    return { success: true, data: vaultData.items || [] };
  } catch {
    return { success: false, error: 'Failed to decrypt vault contents.' };
  }
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

/** The current vault blob and its version, from the provider or, if it's unreachable, the offline cache. */
async function readCurrentVault(
  provider: SyncProvider
): Promise<{ encryptedVault: string | null; vaultVersion: number }> {
  try {
    const vault = await provider.getVault();
    return { encryptedVault: vault?.encryptedVault ?? null, vaultVersion: vault?.vaultVersion ?? 0 };
  } catch (error) {
    console.warn('applyVaultChange(): provider unreachable when reading the current vault, falling back to cache.', error);
    const cached = await getCachedVaultBlob();
    return { encryptedVault: cached?.encryptedVault ?? null, vaultVersion: cached?.vaultVersion ?? 0 };
  }
}

/**
 * Applies a change to the vault and writes it back, re-fetching and re-applying
 * on a version conflict rather than surfacing one to the user (docs/API.md
 * "the extension re-fetches and retries").
 *
 * Every attempt applies the change to the vault as it exists *right now*, so
 * another device's concurrent additions always survive — this never writes back
 * an item list assembled from a stale read. It also decrypts the stored vault
 * before replacing it, which means a vault encrypted under a different master
 * password is refused instead of overwritten.
 */
export async function applyVaultChange(change: VaultChange): Promise<{ success: boolean; error?: string }> {
  const key = await getVaultKey();
  if (!key) return { success: false, error: 'Vault is locked.' };

  const provider = await getActiveProvider();
  if (!provider) return { success: false, error: 'No storage provider configured.' };

  for (let attempt = 1; attempt <= MAX_SAVE_ATTEMPTS; attempt++) {
    const current = await readCurrentVault(provider);

    let currentItems: VaultItem[] = [];
    if (current.encryptedVault) {
      try {
        const vaultData = JSON.parse(await decryptVault(key, current.encryptedVault)) as VaultData;
        currentItems = vaultData.items || [];
      } catch {
        return { success: false, error: 'Failed to decrypt vault contents.' };
      }
    }

    let encryptedVault: string;
    try {
      const vaultData: VaultData = { items: applyChange(currentItems, change) };
      encryptedVault = await encryptVault(key, JSON.stringify(vaultData));
    } catch {
      return { success: false, error: 'Encryption failed.' };
    }

    const result = await provider.updateVault({ encryptedVault, vaultVersion: current.vaultVersion + 1 });

    if (result.success) {
      try {
        const refreshed = await provider.getVault();
        if (refreshed) await setCachedVaultBlob(refreshed.encryptedVault, refreshed.vaultVersion, refreshed.vaultSalt);
      } catch {
        // best-effort cache refresh; the write itself already succeeded
      }
      return { success: true };
    }

    if (result.error.code !== 'CONFLICT') {
      return { success: false, error: result.error.message || 'Failed to save vault.' };
    }

    console.warn(`applyVaultChange(): version conflict on attempt ${attempt}, re-fetching and retrying.`);
  }

  return {
    success: false,
    error: 'Sync conflict: the vault kept changing elsewhere while saving. Please refresh and try again.',
  };
}
