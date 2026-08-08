import { deriveVaultKey, decryptVault, encryptVault, generateSalt } from '@clyro/crypto';
import { getVaultKey, setVaultKey, clearVaultKey } from '../storage/sessionStorage';
import { getCachedVaultBlob, setCachedVaultBlob } from '../storage/localStorage';
import { apiGet, apiPost, apiPut } from '../services/apiClient';
import type { VaultItem, VaultData } from '@clyro/shared-types';

/**
 * Creates a brand-new, empty vault for the current user: generates the
 * (non-secret) vaultSalt, derives the key from the chosen master password,
 * encrypts an empty item list, and POSTs it. Required once per account before
 * unlockVault()/getVaultItems()/saveVaultItems() have anything to work with —
 * GET /vault and PUT /vault both 404 until this has run (see docs/API.md).
 * A CONFLICT (409) means a vault already exists for this user; the caller
 * should route to unlockVault() instead of retrying creation.
 */
export async function createVault(masterPassword: string): Promise<{ success: boolean; error?: string }> {
  const vaultSalt = await generateSalt();
  const key = await deriveVaultKey(masterPassword, vaultSalt);
  const vaultData: VaultData = { items: [] };
  const encryptedVault = await encryptVault(key, JSON.stringify(vaultData));
  const vaultVersion = 1;

  const response = await apiPost<{ encryptedVault: string; vaultSalt: string; vaultVersion: number }>(
    '/vault',
    { encryptedVault, vaultSalt, vaultVersion },
    true
  );

  if (!response.success || !response.data) {
    if (response.error?.code === 'CONFLICT') {
      return { success: false, error: 'A vault already exists for this account.' };
    }
    return { success: false, error: response.error?.message || 'Failed to create vault.' };
  }

  await setCachedVaultBlob(response.data.encryptedVault, response.data.vaultVersion, response.data.vaultSalt);
  await setVaultKey(key);
  return { success: true };
}

/**
 * Attempts to unlock the vault with the given master password.
 * Fetches the vault (from cache if offline/available, otherwise from the server),
 * derives the key from the password + vaultSalt, and attempts to decrypt.
 * A WRONG password is only detected here, via decryption failure — Argon2id
 * itself cannot detect a wrong password (see docs/SECURITY.md's key derivation flow).
 */
export async function unlockVault(masterPassword: string): Promise<{ success: boolean; error?: string }> {
  // 1. Try to get the vault (prefer server if reachable, for freshness; fall back to cache if offline)
  let encryptedVault: string | null = null;
  let vaultSalt: string | null = null;
  let vaultVersion: number | null = null;

  const response = await apiGet<{ encryptedVault: string; vaultSalt: string; vaultVersion: number }>('/vault', true);
  
  if (response.success && response.data) {
    encryptedVault = response.data.encryptedVault;
    vaultSalt = response.data.vaultSalt;
    vaultVersion = response.data.vaultVersion;
    // Cache for offline use
    await setCachedVaultBlob(encryptedVault, vaultVersion, vaultSalt);
  } else {
    // Fall back to cache
    const cached = await getCachedVaultBlob();
    if (cached) {
      encryptedVault = cached.encryptedVault;
      vaultSalt = cached.vaultSalt;
      vaultVersion = cached.vaultVersion;
    }
  }

  if (!encryptedVault || !vaultSalt) {
    return { success: false, error: 'No vault available. Connect to the internet to unlock for the first time.' };
  }

  // 2. Derive the key: deriveVaultKey(masterPassword, vaultSalt)
  const key = await deriveVaultKey(masterPassword, vaultSalt);

  // 3. Attempt decryptVault(key, encryptedVault)
  try {
    await decryptVault(key, encryptedVault);
    // If decryption succeeds: store the key via setVaultKey(key), return { success: true }
    await setVaultKey(key);
    return { success: true };
  } catch {
    // If decryption throws: return { success: false, error: 'Incorrect master password.' }
    return { success: false, error: 'Incorrect master password.' };
  }
}

/**
 * Locks the vault by clearing the derived key from session storage.
 * Does NOT affect auth tokens or login status — locking the vault and being
 * logged out are different states (per docs/PRD.md's offline-access requirement,
 * a user can be logged in with the vault locked, and unlock without hitting the network
 * again if using the cached blob).
 */
export async function lockVault(): Promise<void> {
  await clearVaultKey();
}

export async function isVaultUnlocked(): Promise<boolean> {
  const key = await getVaultKey();
  return key !== null;
}

export async function getVaultItems(): Promise<{ success: boolean; data?: VaultItem[]; error?: string }> {
  const key = await getVaultKey();
  if (!key) return { success: false, error: 'Vault is locked.' };

  let encryptedVault: string | null = null;

  const response = await apiGet<{ encryptedVault: string }>('/vault', true);
  if (response.success && response.data) {
    encryptedVault = response.data.encryptedVault;
  } else {
    const cached = await getCachedVaultBlob();
    if (cached) encryptedVault = cached.encryptedVault;
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

  let vaultVersion = 0;
  const cached = await getCachedVaultBlob();
  if (cached) {
    vaultVersion = cached.vaultVersion;
  } else {
    const metaRes = await apiGet<{ vaultVersion: number }>('/vault/metadata', true);
    if (metaRes.success && metaRes.data) {
      vaultVersion = metaRes.data.vaultVersion;
    }
  }

  try {
    const vaultData: VaultData = { items };
    const serialized = JSON.stringify(vaultData);
    const encryptedVault = await encryptVault(key, serialized);

    const newVaultVersion = vaultVersion + 1;

    const putRes = await apiPut('/vault', { encryptedVault, vaultVersion: newVaultVersion }, true);
    if (putRes.success) {
      const newResponse = await apiGet<{ encryptedVault: string; vaultSalt: string; vaultVersion: number }>('/vault', true);
      if (newResponse.success && newResponse.data) {
        await setCachedVaultBlob(newResponse.data.encryptedVault, newResponse.data.vaultVersion, newResponse.data.vaultSalt);
      }
      return { success: true };
    } else {
      if (putRes.error?.code === 'CONFLICT') {
        return { success: false, error: 'Sync conflict: Vault was modified on another device. Please refresh.' };
      }
      return { success: false, error: putRes.error?.message || 'Failed to save vault.' };
    }
  } catch {
    return { success: false, error: 'Encryption failed.' };
  }
}
