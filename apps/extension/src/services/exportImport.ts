import { deriveVaultKey, decryptVault } from '@clyro/crypto';
import { setVaultKey } from '../storage/sessionStorage';
import { getCachedVaultBlob, setCachedVaultBlob } from '../storage/localStorage';
import { getActiveProvider } from '../providers';

/**
 * The .clyro export file shape. Every field is already encrypted or non-secret
 * (docs/EXTENSION_HANDOFF.md §7) — this is the vault's only recovery path and
 * the only way to move it between storage providers.
 */
export interface VaultExportFile {
  version: 1;
  encryptedVault: string;
  vaultVersion: number;
  vaultSalt: string;
  exportedAt: string;
}

export function buildExportFile(encryptedVault: string, vaultVersion: number, vaultSalt: string): VaultExportFile {
  return { version: 1, encryptedVault, vaultVersion, vaultSalt, exportedAt: new Date().toISOString() };
}

export function parseExportFile(raw: string): VaultExportFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Not a valid Clyro vault export file.');
  }

  const file = parsed as Partial<VaultExportFile>;
  if (
    file?.version !== 1 ||
    typeof file.encryptedVault !== 'string' ||
    typeof file.vaultVersion !== 'number' ||
    typeof file.vaultSalt !== 'string'
  ) {
    throw new Error('Not a valid Clyro vault export file.');
  }

  return file as VaultExportFile;
}

/** Reads the current vault (provider, falling back to cache) and packages it for download. */
export async function exportVault(): Promise<{ success: boolean; data?: VaultExportFile; error?: string }> {
  const provider = await getActiveProvider();
  let vault: { encryptedVault: string; vaultVersion: number; vaultSalt: string } | null = null;

  if (provider) {
    try {
      vault = await provider.getVault();
    } catch {
      // fall through to cache
    }
  }

  if (!vault) {
    vault = await getCachedVaultBlob();
  }

  if (!vault) return { success: false, error: 'No vault to export.' };

  return { success: true, data: buildExportFile(vault.encryptedVault, vault.vaultVersion, vault.vaultSalt) };
}

/**
 * Verifies the master password against the export file's own vaultSalt before
 * touching the active provider, then replaces whatever vault the provider
 * currently holds (this is also how a storage-provider switch happens) and
 * unlocks with the now-verified key.
 */
export async function importVault(rawFileContents: string, masterPassword: string): Promise<{ success: boolean; error?: string }> {
  let file: VaultExportFile;
  try {
    file = parseExportFile(rawFileContents);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Not a valid Clyro vault export file.' };
  }

  const key = await deriveVaultKey(masterPassword, file.vaultSalt);
  try {
    await decryptVault(key, file.encryptedVault);
  } catch {
    return { success: false, error: 'Incorrect master password for this export file.' };
  }

  const provider = await getActiveProvider();
  if (!provider) return { success: false, error: 'No storage provider configured.' };

  const existing = await provider.getVault().catch(() => null);
  if (existing) {
    const deleted = await provider.deleteVault();
    if (!deleted.success) {
      return { success: false, error: deleted.error.message || 'Failed to replace the existing vault.' };
    }
  }

  const created = await provider.createVault({
    encryptedVault: file.encryptedVault,
    vaultVersion: file.vaultVersion,
    vaultSalt: file.vaultSalt,
  });
  if (!created.success) {
    return { success: false, error: created.error.message || 'Failed to import vault.' };
  }

  await setCachedVaultBlob(file.encryptedVault, file.vaultVersion, file.vaultSalt);
  await setVaultKey(key);
  return { success: true };
}
