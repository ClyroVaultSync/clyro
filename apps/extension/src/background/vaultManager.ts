import { deriveVaultKey, decryptVault, encryptVault, generateSalt } from '@clyro/crypto';
import { getVaultKey, setVaultKey, clearVaultKey } from '../storage/sessionStorage';
import { getCachedVaultBlob, setCachedVaultBlob } from '../storage/localStorage';
import { getActiveProvider } from '../providers';
import type { VaultItem, VaultData } from '@clyro/shared-types';

/**
 * Creates a brand-new, empty vault on the active Storage Provider: generates the
 * (non-secret) vaultSalt, derives the key from the chosen master password,
 * encrypts an empty item list, and hands it to the provider. Required once
 * before unlockVault()/getVaultItems()/saveVaultItems() have anything to work
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

export async function saveVaultItems(items: VaultItem[]): Promise<{ success: boolean; error?: string }> {
  const key = await getVaultKey();
  if (!key) return { success: false, error: 'Vault is locked.' };

  const provider = await getActiveProvider();
  if (!provider) return { success: false, error: 'No storage provider configured.' };

  // Prefer the live version over the cache: if a previous cache refresh ever
  // silently failed, trusting a stale cached version here would compute a
  // vaultVersion the server already rejects, or worse, one it doesn't.
  let vaultVersion = 0;
  try {
    const vault = await provider.getVault();
    if (vault) vaultVersion = vault.vaultVersion;
  } catch (error) {
    console.warn('saveVaultItems(): provider unreachable when checking the current version, falling back to cache.', error);
    const cached = await getCachedVaultBlob();
    if (cached) vaultVersion = cached.vaultVersion;
  }

  try {
    const vaultData: VaultData = { items };
    const serialized = JSON.stringify(vaultData);
    const encryptedVault = await encryptVault(key, serialized);
    const newVaultVersion = vaultVersion + 1;

    const result = await provider.updateVault({ encryptedVault, vaultVersion: newVaultVersion });
    if (!result.success) {
      if (result.error.code === 'CONFLICT') {
        return { success: false, error: 'Sync conflict: Vault was modified elsewhere. Please refresh.' };
      }
      return { success: false, error: result.error.message || 'Failed to save vault.' };
    }

    try {
      const refreshed = await provider.getVault();
      if (refreshed) await setCachedVaultBlob(refreshed.encryptedVault, refreshed.vaultVersion, refreshed.vaultSalt);
    } catch {
      // best-effort cache refresh; the write itself already succeeded
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Encryption failed.' };
  }
}
