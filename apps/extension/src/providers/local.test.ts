import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalProvider, setLocalConfig, getLocalConfig, clearLocalConfig } from './local';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const config = { baseUrl: 'http://localhost:8080', pairingToken: 'tok' };

function mockFetchOnce(body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({ json: async () => body }) as unknown as typeof fetch;
}

describe('LocalProvider', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  it('getVault() returns the payload on success', async () => {
    mockFetchOnce({ success: true, data: { encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' } });
    const provider = new LocalProvider(config);

    const result = await provider.getVault();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/vault',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) })
    );
    expect(result).toEqual({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });
  });

  it('getVault() returns null on a NOT_FOUND error', async () => {
    mockFetchOnce({ success: false, error: { code: 'NOT_FOUND', message: 'No vault exists.' } });
    const provider = new LocalProvider(config);

    expect(await provider.getVault()).toBeNull();
  });

  it('getVault() throws on any other error', async () => {
    mockFetchOnce({ success: false, error: { code: 'UNAUTHORIZED', message: 'Bad token.' } });
    const provider = new LocalProvider(config);

    await expect(provider.getVault()).rejects.toThrow('Bad token.');
  });

  it('createVault() posts the payload', async () => {
    mockFetchOnce({ success: true, data: {} });
    const provider = new LocalProvider(config);

    const result = await provider.createVault({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/vault',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' }) })
    );
    expect(result).toEqual({ success: true });
  });

  it('createVault() surfaces a CONFLICT error', async () => {
    mockFetchOnce({ success: false, error: { code: 'CONFLICT', message: 'A vault already exists.' } });
    const provider = new LocalProvider(config);

    const result = await provider.createVault({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });

    expect(result).toEqual({ success: false, error: { code: 'CONFLICT', message: 'A vault already exists.' } });
  });

  it('updateVault() puts the payload', async () => {
    mockFetchOnce({ success: true, data: {} });
    const provider = new LocalProvider(config);

    const result = await provider.updateVault({ encryptedVault: 'e2', vaultVersion: 2 });

    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/vault', expect.objectContaining({ method: 'PUT' }));
    expect(result).toEqual({ success: true });
  });

  it('deleteVault() sends a DELETE request', async () => {
    mockFetchOnce({ success: true, data: { message: 'ok' } });
    const provider = new LocalProvider(config);

    const result = await provider.deleteVault();

    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/vault', expect.objectContaining({ method: 'DELETE' }));
    expect(result).toEqual({ success: true });
  });

  it('isConnected() is true when metadata is reachable', async () => {
    mockFetchOnce({ success: true, data: { vaultVersion: 1, lastModified: 't' } });
    const provider = new LocalProvider(config);

    expect(await provider.isConnected()).toBe(true);
  });

  it('isConnected() is true even with no vault yet (NOT_FOUND still means reachable)', async () => {
    mockFetchOnce({ success: false, error: { code: 'NOT_FOUND', message: 'No vault.' } });
    const provider = new LocalProvider(config);

    expect(await provider.isConnected()).toBe(true);
  });

  it('isConnected() is false when the server is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as unknown as typeof fetch;
    const provider = new LocalProvider(config);

    expect(await provider.isConnected()).toBe(false);
  });

  it('getLocalConfig()/setLocalConfig()/clearLocalConfig() round-trip through chrome.storage.local', async () => {
    expect(await getLocalConfig()).toBeNull();

    await setLocalConfig(config);
    expect(await getLocalConfig()).toEqual(config);

    await clearLocalConfig();
    expect(await getLocalConfig()).toBeNull();
  });
});
