import { deriveVaultKey, decryptVault } from '@clyro/crypto';
import { getVaultKey, setVaultKey, clearVaultKey } from '../storage/sessionStorage';
import { getCachedVaultBlob, setCachedVaultBlob } from '../storage/localStorage';
import { apiGet } from '../services/apiClient';

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
