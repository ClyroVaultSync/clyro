import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createVault, unlockVault, lockVault, isVaultUnlocked, vaultExists } from './vaultManager';
import { deriveVaultKey, decryptVault, encryptVault, generateSalt } from '@clyro/crypto';
import { getVaultKey, setVaultKey, clearVaultKey } from '../storage/sessionStorage';
import { getCachedVaultBlob, setCachedVaultBlob } from '../storage/localStorage';
import { getActiveProvider } from '../providers';

vi.mock('@clyro/crypto', () => ({
  deriveVaultKey: vi.fn(),
  decryptVault: vi.fn(),
  encryptVault: vi.fn(),
  generateSalt: vi.fn(),
}));

vi.mock('../storage/sessionStorage', () => ({
  getVaultKey: vi.fn(),
  setVaultKey: vi.fn(),
  clearVaultKey: vi.fn(),
}));

vi.mock('../storage/localStorage', () => ({
  getCachedVaultBlob: vi.fn(),
  setCachedVaultBlob: vi.fn(),
}));

vi.mock('../providers', () => ({
  getActiveProvider: vi.fn(),
}));

function mockProvider(overrides: Partial<Record<'getVault' | 'createVault' | 'updateVault' | 'deleteVault' | 'isConnected', Mock>> = {}) {
  return {
    id: 'local' as const,
    getVault: vi.fn().mockResolvedValue(null),
    createVault: vi.fn().mockResolvedValue({ success: true }),
    updateVault: vi.fn().mockResolvedValue({ success: true }),
    deleteVault: vi.fn().mockResolvedValue({ success: true }),
    isConnected: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('vaultManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unlockVault() success path (provider fetch succeeds, decrypt succeeds, key gets stored)', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: 'encrypted-data', vaultSalt: 'salt123', vaultVersion: 1 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (deriveVaultKey as Mock).mockResolvedValue('derived-key');
    (decryptVault as Mock).mockResolvedValue('decrypted-data');

    const result = await unlockVault('correct-password');

    expect(provider.getVault).toHaveBeenCalled();
    expect(setCachedVaultBlob).toHaveBeenCalledWith('encrypted-data', 1, 'salt123');
    expect(deriveVaultKey).toHaveBeenCalledWith('correct-password', 'salt123');
    expect(decryptVault).toHaveBeenCalledWith('derived-key', 'encrypted-data');
    expect(setVaultKey).toHaveBeenCalledWith('derived-key');
    expect(result).toEqual({ success: true });
  });

  it('unlockVault() with wrong password returns false and does not call setVaultKey', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: 'encrypted-data', vaultSalt: 'salt123', vaultVersion: 1 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (deriveVaultKey as Mock).mockResolvedValue('derived-key');
    (decryptVault as Mock).mockRejectedValue(new Error('Decryption failed'));

    const result = await unlockVault('wrong-password');

    expect(setVaultKey).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'Incorrect master password.' });
  });

  it('unlockVault() falls back to cache when the provider is unreachable', async () => {
    const provider = mockProvider({ getVault: vi.fn().mockRejectedValue(new Error('offline')) });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (getCachedVaultBlob as Mock).mockResolvedValue({ encryptedVault: 'cached-encrypted', vaultSalt: 'cached-salt', vaultVersion: 1 });
    (deriveVaultKey as Mock).mockResolvedValue('derived-key');
    (decryptVault as Mock).mockResolvedValue('decrypted-data');

    const result = await unlockVault('correct-password');

    expect(getCachedVaultBlob).toHaveBeenCalled();
    expect(deriveVaultKey).toHaveBeenCalledWith('correct-password', 'cached-salt');
    expect(decryptVault).toHaveBeenCalledWith('derived-key', 'cached-encrypted');
    expect(setVaultKey).toHaveBeenCalledWith('derived-key');
    expect(result).toEqual({ success: true });
  });

  it('unlockVault() fails cleanly when BOTH provider and cache are unavailable', async () => {
    (getActiveProvider as Mock).mockResolvedValue(null);
    (getCachedVaultBlob as Mock).mockResolvedValue(null);

    const result = await unlockVault('password');

    expect(deriveVaultKey).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: 'No vault available. Connect to the Local Sync Server to unlock for the first time.',
    });
  });

  it('lockVault() calls clearVaultKey()', async () => {
    await lockVault();
    expect(clearVaultKey).toHaveBeenCalled();
  });

  it('isVaultUnlocked() reflects key presence correctly', async () => {
    (getVaultKey as Mock).mockResolvedValue('some-key');
    expect(await isVaultUnlocked()).toBe(true);

    (getVaultKey as Mock).mockResolvedValue(null);
    expect(await isVaultUnlocked()).toBe(false);
  });

  it('createVault() generates a salt, encrypts an empty vault, and stores the key on success', async () => {
    const provider = mockProvider();
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (generateSalt as Mock).mockResolvedValue('new-salt');
    (deriveVaultKey as Mock).mockResolvedValue('derived-key');
    (encryptVault as Mock).mockResolvedValue('encrypted-empty-vault');

    const result = await createVault('new-master-password');

    expect(generateSalt).toHaveBeenCalled();
    expect(deriveVaultKey).toHaveBeenCalledWith('new-master-password', 'new-salt');
    expect(provider.createVault).toHaveBeenCalledWith({
      encryptedVault: 'encrypted-empty-vault',
      vaultSalt: 'new-salt',
      vaultVersion: 1,
    });
    expect(setCachedVaultBlob).toHaveBeenCalledWith('encrypted-empty-vault', 1, 'new-salt');
    expect(setVaultKey).toHaveBeenCalledWith('derived-key');
    expect(result).toEqual({ success: true });
  });

  it('createVault() surfaces a clear error when a vault already exists', async () => {
    const provider = mockProvider({
      createVault: vi.fn().mockResolvedValue({ success: false, error: { code: 'CONFLICT', message: 'exists' } }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (generateSalt as Mock).mockResolvedValue('new-salt');
    (deriveVaultKey as Mock).mockResolvedValue('derived-key');
    (encryptVault as Mock).mockResolvedValue('encrypted-empty-vault');

    const result = await createVault('new-master-password');

    expect(setVaultKey).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'A vault already exists on this storage provider.' });
  });

  it('createVault() fails cleanly with no provider configured', async () => {
    (getActiveProvider as Mock).mockResolvedValue(null);

    const result = await createVault('password');

    expect(result).toEqual({ success: false, error: 'No storage provider configured.' });
  });

  it('vaultExists() returns true when the provider has a vault', async () => {
    const provider = mockProvider({ getVault: vi.fn().mockResolvedValue({ encryptedVault: 'x', vaultSalt: 'y', vaultVersion: 1 }) });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    expect(await vaultExists()).toBe(true);
  });

  it('vaultExists() returns false when the provider has none', async () => {
    const provider = mockProvider({ getVault: vi.fn().mockResolvedValue(null) });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    expect(await vaultExists()).toBe(false);
  });

  it('vaultExists() falls back to the offline cache when the provider is unreachable', async () => {
    const provider = mockProvider({ getVault: vi.fn().mockRejectedValue(new Error('offline')) });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (getCachedVaultBlob as Mock).mockResolvedValue({ encryptedVault: 'x', vaultSalt: 'y', vaultVersion: 1 });

    expect(await vaultExists()).toBe(true);

    (getCachedVaultBlob as Mock).mockResolvedValue(null);
    expect(await vaultExists()).toBe(false);
  });
});
