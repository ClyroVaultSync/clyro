import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createVault, unlockVault, lockVault, isVaultUnlocked, vaultExists, applyChange, applyVaultChange } from './vaultManager';
import type { VaultItem } from '@clyro/shared-types';
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

function item(id: string, overrides: Partial<VaultItem> = {}): VaultItem {
  return {
    id,
    name: id,
    url: `${id}.com`,
    username: `${id}@example.com`,
    password: 'pw',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('applyChange()', () => {
  it('appends an item whose id is not present yet', () => {
    expect(applyChange([item('a')], { upsert: [item('b')] }).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('replaces in place, preserving position, when the id already exists', () => {
    const result = applyChange([item('a'), item('b'), item('c')], { upsert: [item('b', { password: 'new' })] });

    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(result[1].password).toBe('new');
  });

  it('deletes only the named ids', () => {
    expect(applyChange([item('a'), item('b'), item('c')], { deleteIds: ['b'] }).map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('deletes before upserting, so deleting and re-adding the same id keeps the item', () => {
    const result = applyChange([item('a', { password: 'old' })], { deleteIds: ['a'], upsert: [item('a', { password: 'new' })] });

    expect(result).toHaveLength(1);
    expect(result[0].password).toBe('new');
  });

  it('leaves the list untouched for an empty change', () => {
    const items = [item('a')];
    expect(applyChange(items, {})).toEqual(items);
  });
});

describe('applyVaultChange()', () => {
  /** Wires the crypto mocks so a vault round-trips as JSON, letting assertions read what was written. */
  function mockCryptoRoundTrip() {
    (decryptVault as Mock).mockImplementation(async (_key: string, blob: string) => blob);
    (encryptVault as Mock).mockImplementation(async (_key: string, plaintext: string) => plaintext);
  }

  function vaultBlob(items: VaultItem[]): string {
    return JSON.stringify({ items });
  }

  function writtenItems(provider: ReturnType<typeof mockProvider>, call = 0): VaultItem[] {
    const payload = provider.updateVault.mock.calls[call][0] as { encryptedVault: string };
    return (JSON.parse(payload.encryptedVault) as { items: VaultItem[] }).items;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (getVaultKey as Mock).mockResolvedValue('derived-key');
    mockCryptoRoundTrip();
  });

  it('applies the change to the vault as it currently stands and writes the next version', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([item('a')]), vaultSalt: 'salt', vaultVersion: 7 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('b')] });

    expect(result).toEqual({ success: true });
    expect(provider.updateVault).toHaveBeenCalledWith({ encryptedVault: vaultBlob([item('a'), item('b')]), vaultVersion: 8 });
  });

  it('keeps an item another device added that the caller never saw', async () => {
    // The caller's screen still shows only 'a'; 'remote' landed in the vault after it read.
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({
        encryptedVault: vaultBlob([item('a'), item('remote')]),
        vaultSalt: 'salt',
        vaultVersion: 9,
      }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    await applyVaultChange({ upsert: [item('mine')] });

    expect(writtenItems(provider).map((i) => i.id)).toEqual(['a', 'remote', 'mine']);
  });

  it('re-fetches and retries on CONFLICT, re-applying the change to the newer vault', async () => {
    const provider = mockProvider({
      getVault: vi
        .fn()
        .mockResolvedValueOnce({ encryptedVault: vaultBlob([item('a')]), vaultSalt: 'salt', vaultVersion: 4 })
        .mockResolvedValue({ encryptedVault: vaultBlob([item('a'), item('landed-first')]), vaultSalt: 'salt', vaultVersion: 5 }),
      updateVault: vi
        .fn()
        .mockResolvedValueOnce({ success: false, error: { code: 'CONFLICT', message: 'stale' } })
        .mockResolvedValue({ success: true }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('mine')] });

    expect(result).toEqual({ success: true });
    expect(provider.updateVault).toHaveBeenCalledTimes(2);
    // The retry must be based on the newer vault, not a replay of the first attempt.
    expect(writtenItems(provider, 1).map((i) => i.id)).toEqual(['a', 'landed-first', 'mine']);
    expect((provider.updateVault.mock.calls[1][0] as { vaultVersion: number }).vaultVersion).toBe(6);
  });

  it('gives up after three attempts when the vault keeps moving', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([]), vaultSalt: 'salt', vaultVersion: 1 }),
      updateVault: vi.fn().mockResolvedValue({ success: false, error: { code: 'CONFLICT', message: 'stale' } }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('mine')] });

    expect(provider.updateVault).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Sync conflict');
  });

  it('does not retry a failure that is not a conflict', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([]), vaultSalt: 'salt', vaultVersion: 1 }),
      updateVault: vi.fn().mockResolvedValue({ success: false, error: { code: 'NETWORK_ERROR', message: 'unreachable' } }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('mine')] });

    expect(provider.updateVault).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: false, error: 'unreachable' });
  });

  it('refuses to overwrite a stored vault it cannot decrypt', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: 'other-password', vaultSalt: 'salt', vaultVersion: 3 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (decryptVault as Mock).mockRejectedValue(new Error('bad key'));

    const result = await applyVaultChange({ upsert: [item('mine')] });

    expect(provider.updateVault).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'Failed to decrypt vault contents.' });
  });

  it('refreshes the offline cache from the provider after a successful write', async () => {
    const provider = mockProvider({
      getVault: vi
        .fn()
        .mockResolvedValueOnce({ encryptedVault: vaultBlob([]), vaultSalt: 'salt', vaultVersion: 2 })
        .mockResolvedValue({ encryptedVault: 'stored-blob', vaultSalt: 'salt', vaultVersion: 3 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    await applyVaultChange({ upsert: [item('mine')] });

    expect(setCachedVaultBlob).toHaveBeenCalledWith('stored-blob', 3, 'salt');
  });

  it('falls back to the cached blob when the provider cannot be read', async () => {
    const provider = mockProvider({ getVault: vi.fn().mockRejectedValue(new Error('offline')) });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (getCachedVaultBlob as Mock).mockResolvedValue({ encryptedVault: vaultBlob([item('a')]), vaultSalt: 'salt', vaultVersion: 6 });

    await applyVaultChange({ upsert: [item('b')] });

    expect(provider.updateVault).toHaveBeenCalledWith({ encryptedVault: vaultBlob([item('a'), item('b')]), vaultVersion: 7 });
  });

  it('refuses to write while the vault is locked', async () => {
    (getVaultKey as Mock).mockResolvedValue(null);

    const result = await applyVaultChange({ upsert: [item('mine')] });

    expect(getActiveProvider).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'Vault is locked.' });
  });

  it('fails cleanly with no provider configured', async () => {
    (getActiveProvider as Mock).mockResolvedValue(null);

    expect(await applyVaultChange({ upsert: [item('mine')] })).toEqual({
      success: false,
      error: 'No storage provider configured.',
    });
  });
});
