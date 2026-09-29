import type { SyncProvider, VaultPayload, VaultUpdatePayload, SyncResult } from '@clyro/shared-types';
import { ProviderUnreachableError, fetchOrUnreachable, errorCode } from './errors';

export interface GoogleDriveProviderConfig {
  connected: true;
  /** Cached Drive fileId for the vault file, so later calls can skip the by-name search. */
  vaultFileId?: string;
}

const CONFIG_KEY = 'googleDriveProviderConfig';
const VAULT_FILE_NAME = 'clyro-vault.json';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const MULTIPART_BOUNDARY = 'clyro-vault-boundary';

export async function setGoogleDriveConfig(config: GoogleDriveProviderConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}

export async function getGoogleDriveConfig(): Promise<GoogleDriveProviderConfig | null> {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  return (result[CONFIG_KEY] as GoogleDriveProviderConfig) || null;
}

export async function clearGoogleDriveConfig(): Promise<void> {
  await chrome.storage.local.remove(CONFIG_KEY);
  await chrome.identity.clearAllCachedAuthTokens();
}

/** Runs once during first-run setup to surface Google's interactive consent screen. */
export async function connectGoogleDrive(): Promise<{ success: boolean; error?: string }> {
  try {
    await getToken(true);
    await setGoogleDriveConfig({ connected: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Google Drive request failed.';
}

/**
 * The token cache (see chrome.identity docs) makes it cheap to call this non-interactively before every request.
 * Chrome can't refresh an expired token without a connection, so a failure while the browser is offline is
 * unreachability, not a sign-in problem.
 */
async function getToken(interactive: boolean): Promise<string> {
  let token: string | undefined;
  try {
    ({ token } = await chrome.identity.getAuthToken({ interactive }));
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ProviderUnreachableError('Could not reach Google Drive.');
    }
    throw error;
  }
  if (!token) throw new Error('Not signed in to Google, or Drive access was not granted.');
  return token;
}

/** Wraps fetch with the current Drive token, retrying once with a fresh token on a 401. */
async function authorizedFetch(url: string, init?: RequestInit): Promise<Response> {
  let token = await getToken(false);
  let res = await fetchOrUnreachable(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } }, 'Google Drive');

  if (res.status === 401) {
    await chrome.identity.removeCachedAuthToken({ token });
    token = await getToken(false);
    res = await fetchOrUnreachable(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } }, 'Google Drive');
  }

  return res;
}

function buildMultipartBody(metadata: object, payload: VaultPayload): string {
  return (
    `--${MULTIPART_BOUNDARY}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${MULTIPART_BOUNDARY}\r\n` +
    `Content-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n` +
    `--${MULTIPART_BOUNDARY}--`
  );
}

async function getCachedFileId(): Promise<string | null> {
  const config = await getGoogleDriveConfig();
  return config?.vaultFileId ?? null;
}

async function setCachedFileId(vaultFileId: string): Promise<void> {
  await setGoogleDriveConfig({ connected: true, vaultFileId });
}

async function clearCachedFileId(): Promise<void> {
  await setGoogleDriveConfig({ connected: true });
}

/**
 * Finds the vault file's Drive fileId inside the hidden per-app appDataFolder, or
 * null if none exists yet. The id rarely changes once found, so it's cached in
 * GoogleDriveProviderConfig and reused directly — skipping a by-name search API
 * call on every single provider action (get/update/delete) that previously made
 * one before it could do the read/write it actually needed.
 */
async function findVaultFileId(): Promise<string | null> {
  const cached = await getCachedFileId();
  if (cached) return cached;

  const query = encodeURIComponent(`name='${VAULT_FILE_NAME}' and trashed=false`);
  const res = await authorizedFetch(`${DRIVE_FILES_URL}?spaces=appDataFolder&q=${query}&fields=files(id)`);
  if (!res.ok) throw new Error(`Drive API error (${res.status}) while looking up the vault file.`);
  const body = await res.json();
  const fileId = body.files?.[0]?.id ?? null;
  if (fileId) await setCachedFileId(fileId);
  return fileId;
}

/** Returns null (not a thrown error) on a 404, so callers can treat a stale cached fileId as "not found" rather than a hard failure. */
async function downloadFile(fileId: string): Promise<VaultPayload | null> {
  const res = await authorizedFetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Drive API error (${res.status}) while downloading the vault file.`);
  return (await res.json()) as VaultPayload;
}

/** Returns the new file's Drive fileId, which the caller caches. */
async function createFile(payload: VaultPayload): Promise<string> {
  const metadata = { name: VAULT_FILE_NAME, parents: ['appDataFolder'] };
  const res = await authorizedFetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${MULTIPART_BOUNDARY}` },
    body: buildMultipartBody(metadata, payload),
  });
  if (!res.ok) throw new Error(`Drive API error (${res.status}) while creating the vault file.`);
  const body = await res.json();
  return body.id as string;
}

async function overwriteFile(fileId: string, payload: VaultPayload): Promise<void> {
  const res = await authorizedFetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Drive API error (${res.status}) while updating the vault file.`);
}

/**
 * Talks to the Google Drive API, storing the vault as a single file in the hidden,
 * app-only `appDataFolder` (docs/ARCHITECTURE.md "Vault Synchronization"). Unlike
 * Dropbox, Drive has no compare-and-swap precondition, so a concurrent write can't
 * be rejected atomically — updateVault() re-reads the stored version immediately
 * before writing and reports CONFLICT on a mismatch, leaving it to vaultManager's
 * applyVaultChange() to re-apply the change to the newer vault and write again.
 * That leaves a small inherent race Drive cannot close.
 */
export class GoogleDriveProvider implements SyncProvider {
  id = 'google-drive' as const;

  async getVault(): Promise<VaultPayload | null> {
    const fileId = await findVaultFileId();
    if (!fileId) return null;

    const payload = await downloadFile(fileId);
    if (payload) return payload;

    // The cached fileId no longer points to a real file — clear it and search once more
    // before concluding there's genuinely no vault.
    await clearCachedFileId();
    const freshId = await findVaultFileId();
    if (!freshId) return null;
    return downloadFile(freshId);
  }

  async createVault(payload: VaultPayload): Promise<SyncResult> {
    try {
      const existing = await findVaultFileId();
      if (existing) {
        return { success: false, error: { code: 'CONFLICT', message: 'A vault already exists on Google Drive.' } };
      }
      const fileId = await createFile(payload);
      await setCachedFileId(fileId);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: errorCode(error, 'DRIVE_ERROR'), message: errorMessage(error) } };
    }
  }

  async updateVault(payload: VaultUpdatePayload): Promise<SyncResult> {
    try {
      const fileId = await findVaultFileId();
      if (!fileId) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'No vault exists on Google Drive yet.' } };
      }

      const current = await downloadFile(fileId);
      if (!current) {
        await clearCachedFileId();
        return { success: false, error: { code: 'NOT_FOUND', message: 'No vault exists on Google Drive yet.' } };
      }

      if (current.vaultVersion >= payload.vaultVersion) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'Vault was modified elsewhere; please refresh and try again.' },
        };
      }

      await overwriteFile(fileId, { ...payload, vaultSalt: current.vaultSalt });
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: errorCode(error, 'DRIVE_ERROR'), message: errorMessage(error) } };
    }
  }

  async deleteVault(): Promise<SyncResult> {
    try {
      const fileId = await findVaultFileId();
      if (fileId) {
        const res = await authorizedFetch(`${DRIVE_FILES_URL}/${fileId}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) throw new Error(`Drive API error (${res.status}) while deleting the vault file.`);
      }
      await clearCachedFileId();
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: errorCode(error, 'DRIVE_ERROR'), message: errorMessage(error) } };
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await getToken(false);
      return true;
    } catch {
      return false;
    }
  }
}
