import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GoogleDriveProvider,
  connectGoogleDrive,
  setGoogleDriveConfig,
  getGoogleDriveConfig,
  clearGoogleDriveConfig,
} from './googleDrive';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockStorage = new Map<string, any>();

global.chrome = {
  storage: {
    local: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set: vi.fn(async (items: Record<string, any>) => {
        for (const [key, value] of Object.entries(items)) mockStorage.set(key, value);
      }),
      get: vi.fn(async (key: string) => ({ [key]: mockStorage.get(key) })),
      remove: vi.fn(async (key: string) => {
        mockStorage.delete(key);
      }),
    },
  },
  identity: {
    getAuthToken: vi.fn(async () => ({ token: 'tok' })),
    removeCachedAuthToken: vi.fn(async () => {}),
    clearAllCachedAuthTokens: vi.fn(async () => {}),
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('GoogleDriveProvider', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
    (chrome.identity.getAuthToken as ReturnType<typeof vi.fn>).mockResolvedValue({ token: 'tok' });
  });

  it('getVault() returns null when no vault file exists yet', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ files: [] }));
    const provider = new GoogleDriveProvider();

    expect(await provider.getVault()).toBeNull();
  });

  it('getVault() downloads and returns the payload when the file exists', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'file-1' }] }))
      .mockResolvedValueOnce(jsonResponse({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' }));
    const provider = new GoogleDriveProvider();

    const result = await provider.getVault();

    expect(result).toEqual({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });
  });

  it('getVault() reuses the cached fileId on a second call instead of searching by name again', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'file-1' }] })) // first call's search
      .mockResolvedValueOnce(jsonResponse({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' })) // first call's download
      .mockResolvedValueOnce(jsonResponse({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' })); // second call's download only
    const provider = new GoogleDriveProvider();

    await provider.getVault();
    await provider.getVault();

    expect(fetch).toHaveBeenCalledTimes(3); // one search, two downloads — no second search
  });

  it('getVault() recovers from a stale cached fileId by clearing it and searching again', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'stale-id' }] })) // first search finds a now-deleted file
      .mockResolvedValueOnce(jsonResponse({}, false, 404)) // downloading it 404s
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'real-id' }] })) // re-search after clearing the stale cache
      .mockResolvedValueOnce(jsonResponse({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' })); // download real-id
    const provider = new GoogleDriveProvider();

    const result = await provider.getVault();

    expect(result).toEqual({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('createVault() creates the file when none exists', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: 'new-file' }));
    const provider = new GoogleDriveProvider();

    const result = await provider.createVault({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });

    expect(result).toEqual({ success: true });
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('uploadType=multipart'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('createVault() caches the new fileId so a later getVault() skips searching again', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [] })) // existing-vault check
      .mockResolvedValueOnce(jsonResponse({ id: 'new-file' })) // create response
      .mockResolvedValueOnce(jsonResponse({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' })); // later getVault()'s download
    const provider = new GoogleDriveProvider();

    await provider.createVault({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });
    const result = await provider.getVault();

    expect(result).toEqual({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });
    expect(fetch).toHaveBeenCalledTimes(3); // no extra search before the second download
  });

  it('createVault() returns CONFLICT when a vault file already exists', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ files: [{ id: 'file-1' }] }));
    const provider = new GoogleDriveProvider();

    const result = await provider.createVault({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });

    expect(result).toEqual({
      success: false,
      error: { code: 'CONFLICT', message: 'A vault already exists on Google Drive.' },
    });
  });

  it('updateVault() overwrites the file when versions are in order', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'file-1' }] })) // findVaultFileId
      .mockResolvedValueOnce(jsonResponse({ encryptedVault: 'old', vaultVersion: 1, vaultSalt: 's' })) // downloadFile
      .mockResolvedValueOnce(jsonResponse({})); // overwriteFile
    const provider = new GoogleDriveProvider();

    const result = await provider.updateVault({ encryptedVault: 'new', vaultVersion: 2 });

    expect(result).toEqual({ success: true });
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('uploadType=media'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ encryptedVault: 'new', vaultVersion: 2, vaultSalt: 's' }) })
    );
  });

  it('updateVault() reports CONFLICT on a version race, writing nothing at all', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'file-1' }] })) // findVaultFileId
      .mockResolvedValueOnce(jsonResponse({ encryptedVault: 'newer', vaultVersion: 3, vaultSalt: 's' })); // downloadFile
    const provider = new GoogleDriveProvider();

    const result = await provider.updateVault({ encryptedVault: 'stale-write', vaultVersion: 2 });

    expect(result.success).toBe(false);
    expect((result as { error: { code: string } }).error.code).toBe('CONFLICT');
    // No overwrite, and no conflict-copy file either — vaultManager re-applies the
    // change to the newer vault and writes again instead.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('deleteVault() is a no-op success when no file exists', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ files: [] }));
    const provider = new GoogleDriveProvider();

    expect(await provider.deleteVault()).toEqual({ success: true });
  });

  it('isConnected() is false when getAuthToken fails', async () => {
    (chrome.identity.getAuthToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not signed in'));
    const provider = new GoogleDriveProvider();

    expect(await provider.isConnected()).toBe(false);
  });

  it('a 401 response triggers one token refresh and retry', async () => {
    (chrome.identity.getAuthToken as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ token: 'stale-tok' })
      .mockResolvedValueOnce({ token: 'fresh-tok' });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 401))
      .mockResolvedValueOnce(jsonResponse({ files: [] }));
    const provider = new GoogleDriveProvider();

    expect(await provider.getVault()).toBeNull();
    expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith({ token: 'stale-tok' });
  });

  it('connectGoogleDrive() requests an interactive token and marks the provider connected', async () => {
    const result = await connectGoogleDrive();

    expect(chrome.identity.getAuthToken).toHaveBeenCalledWith({ interactive: true });
    expect(result).toEqual({ success: true });
    expect(await getGoogleDriveConfig()).toEqual({ connected: true });
  });

  it('connectGoogleDrive() surfaces a failure when Google denies access', async () => {
    (chrome.identity.getAuthToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('User cancelled.'));

    const result = await connectGoogleDrive();

    expect(result).toEqual({ success: false, error: 'User cancelled.' });
  });

  it('getGoogleDriveConfig()/setGoogleDriveConfig()/clearGoogleDriveConfig() round-trip through chrome.storage.local', async () => {
    expect(await getGoogleDriveConfig()).toBeNull();

    await setGoogleDriveConfig({ connected: true });
    expect(await getGoogleDriveConfig()).toEqual({ connected: true });

    await clearGoogleDriveConfig();
    expect(await getGoogleDriveConfig()).toBeNull();
    expect(chrome.identity.clearAllCachedAuthTokens).toHaveBeenCalled();
  });
});
