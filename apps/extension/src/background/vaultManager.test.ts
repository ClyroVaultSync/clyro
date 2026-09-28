import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  createVault,
  unlockVault,
  lockVault,
  isVaultUnlocked,
  vaultExists,
  getVaultItems,
  applyChange,
  applyVaultChange,
  syncPendingChanges,
  withPendingChanges,
  type VaultChange,
} from './vaultManager';
import type { VaultItem } from '@clyro/shared-types';
import { deriveVaultKey, decryptVault, encryptVault, generateSalt } from '@clyro/crypto';
import { getVaultKey, setVaultKey, clearVaultKey } from '../storage/sessionStorage';
import {
  getCachedVaultBlob,
  setCachedVaultBlob,
  getPendingChangesRecord,
  setPendingChangesRecord,
  clearPendingChangesRecord,
  type PendingChangesRecord,
} from '../storage/localStorage';
import { getActiveProvider } from '../providers';
import { ProviderUnreachableError } from '../providers/errors';

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
  getPendingChangesRecord: vi.fn(),
  setPendingChangesRecord: vi.fn(),
  clearPendingChangesRecord: vi.fn(),
}));

vi.mock('../providers', () => ({
  getActiveProvider: vi.fn(),
}));

global.chrome = {
  alarms: {
    create: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(true),
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

/** The offline write queue's storage, held in memory so the real syncQueue.ts runs against it. */
let storedQueue: PendingChangesRecord | null = null;

function useInMemoryQueue() {
  storedQueue = null;
  (getPendingChangesRecord as Mock).mockImplementation(async () => storedQueue);
  (setPendingChangesRecord as Mock).mockImplementation(async (record: PendingChangesRecord) => {
    storedQueue = record;
  });
  (clearPendingChangesRecord as Mock).mockImplementation(async () => {
    storedQueue = null;
  });
}

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
    useInMemoryQueue();
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

/**
 * An unlocked vault whose crypto mocks round-trip as plain JSON, so assertions
 * can read what was written — to the provider and to the offline queue alike.
 */
function setUpUnlockedVault() {
  vi.clearAllMocks();
  useInMemoryQueue();
  (getVaultKey as Mock).mockResolvedValue('derived-key');
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

/** What the offline queue currently holds (readable directly, given the pass-through crypto). */
function queuedChanges(): VaultChange[] {
  return storedQueue ? (JSON.parse(storedQueue.encryptedChanges) as VaultChange[]) : [];
}

function queueChanges(changes: VaultChange[], lastError: string | null = 'Could not reach the Local Sync Server.') {
  storedQueue = { encryptedChanges: JSON.stringify(changes), count: changes.length, lastError };
}

const unreachable = () => vi.fn().mockRejectedValue(new ProviderUnreachableError('Could not reach the Local Sync Server.'));

describe('applyVaultChange()', () => {
  beforeEach(setUpUnlockedVault);

  it('applies the change to the vault as it currently stands and writes the next version', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([item('a')]), vaultSalt: 'salt', vaultVersion: 7 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('b')] });

    expect(result).toEqual({ success: true, synced: true });
    expect(provider.updateVault).toHaveBeenCalledWith({ encryptedVault: vaultBlob([item('a'), item('b')]), vaultVersion: 8 });
    expect(storedQueue).toBeNull();
  });

  it('stores the change on this device before sending it anywhere', async () => {
    let queuedDuringWrite: VaultChange[] = [];
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([]), vaultSalt: 'salt', vaultVersion: 1 }),
      updateVault: vi.fn().mockImplementation(async () => {
        queuedDuringWrite = queuedChanges();
        return { success: true };
      }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    await applyVaultChange({ upsert: [item('mine')] });

    expect(queuedDuringWrite).toEqual([{ upsert: [item('mine')] }]);
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

    expect(result).toEqual({ success: true, synced: true });
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
    // A failure hands the change back to the caller rather than keeping it queued.
    expect(storedQueue).toBeNull();
  });

  it('does not retry or queue a failure that is neither a conflict nor unreachability', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([]), vaultSalt: 'salt', vaultVersion: 1 }),
      updateVault: vi.fn().mockResolvedValue({ success: false, error: { code: 'UNAUTHORIZED', message: 'Bad token.' } }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('mine')] });

    expect(provider.updateVault).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: false, error: 'Bad token.' });
    expect(storedQueue).toBeNull();
  });

  it('keeps the change queued, and reports it unsynced, when the provider cannot be reached', async () => {
    const provider = mockProvider({ getVault: unreachable() });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('mine')] });

    expect(result).toEqual({ success: true, synced: false });
    expect(provider.updateVault).not.toHaveBeenCalled();
    expect(queuedChanges()).toEqual([{ upsert: [item('mine')] }]);
    expect(storedQueue?.lastError).toBe('Could not reach the Local Sync Server.');
    expect(chrome.alarms.create).toHaveBeenCalled();
  });

  it('keeps the change queued when the write itself cannot get through', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([]), vaultSalt: 'salt', vaultVersion: 1 }),
      updateVault: vi.fn().mockResolvedValue({ success: false, error: { code: 'NETWORK_ERROR', message: 'Could not reach Dropbox.' } }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('mine')] });

    expect(provider.updateVault).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, synced: false });
    expect(queuedChanges()).toHaveLength(1);
    expect(storedQueue?.lastError).toBe('Could not reach Dropbox.');
  });

  it('sends earlier queued changes with the next save, in order, as one write', async () => {
    queueChanges([{ upsert: [item('x')] }]);
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([item('a')]), vaultSalt: 'salt', vaultVersion: 4 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    // Added offline, then deleted once back online: applied in that order, 'x' ends up gone.
    const result = await applyVaultChange({ deleteIds: ['x'] });

    expect(result).toEqual({ success: true, synced: true });
    expect(provider.updateVault).toHaveBeenCalledTimes(1);
    expect(writtenItems(provider).map((i) => i.id)).toEqual(['a']);
    expect(storedQueue).toBeNull();
    expect(chrome.alarms.clear).toHaveBeenCalled();
  });

  it('takes back only the new change on failure, leaving earlier queued ones to sync later', async () => {
    queueChanges([{ upsert: [item('earlier')] }]);
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([]), vaultSalt: 'salt', vaultVersion: 1 }),
      updateVault: vi.fn().mockResolvedValue({ success: false, error: { code: 'UNAUTHORIZED', message: 'Bad token.' } }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('new')] });

    expect(result).toEqual({ success: false, error: 'Bad token.' });
    expect(queuedChanges()).toEqual([{ upsert: [item('earlier')] }]);
    expect(storedQueue?.lastError).toBe('Bad token.');
  });

  it('does not lose a change when two saves arrive at once', async () => {
    const provider = mockProvider({ getVault: unreachable() });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    await Promise.all([applyVaultChange({ upsert: [item('one')] }), applyVaultChange({ upsert: [item('two')] })]);

    expect(queuedChanges()).toEqual([{ upsert: [item('one')] }, { upsert: [item('two')] }]);
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

  it('updates the offline cache with exactly what it wrote, without downloading it again', async () => {
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([]), vaultSalt: 'salt', vaultVersion: 2 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    await applyVaultChange({ upsert: [item('mine')] });

    expect(provider.getVault).toHaveBeenCalledTimes(1);
    expect(setCachedVaultBlob).toHaveBeenCalledWith(vaultBlob([item('mine')]), 3, 'salt');
  });

  it('never writes on top of the cached copy when the provider cannot be read', async () => {
    // Writing "cache version + 1" blind is what the old fallback did; a queued change is the safe version of it.
    const provider = mockProvider({ getVault: unreachable() });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (getCachedVaultBlob as Mock).mockResolvedValue({ encryptedVault: vaultBlob([item('a')]), vaultSalt: 'salt', vaultVersion: 6 });

    await applyVaultChange({ upsert: [item('b')] });

    expect(provider.updateVault).not.toHaveBeenCalled();
  });

  it('reports, rather than queues, a provider read that fails for another reason', async () => {
    const provider = mockProvider({ getVault: vi.fn().mockRejectedValue(new Error('Bad token.')) });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const result = await applyVaultChange({ upsert: [item('b')] });

    expect(result).toEqual({ success: false, error: 'Bad token.' });
    expect(storedQueue).toBeNull();
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

/** Background syncs run behind the queue lock, so awaiting one more sync waits for any already started. */
const backgroundSyncsSettled = () => syncPendingChanges();

describe('getVaultItems() with changes waiting to sync', () => {
  beforeEach(setUpUnlockedVault);

  it('shows queued changes on top of the offline copy', async () => {
    queueChanges([{ upsert: [item('saved-offline')] }, { deleteIds: ['a'] }]);
    (getActiveProvider as Mock).mockResolvedValue(mockProvider({ getVault: unreachable() }));
    (getCachedVaultBlob as Mock).mockResolvedValue({ encryptedVault: vaultBlob([item('a'), item('b')]), vaultSalt: 'salt', vaultVersion: 2 });

    const result = await getVaultItems();

    expect(result.data?.map((i) => i.id)).toEqual(['b', 'saved-offline']);
  });

  it('shows queued changes even before the vault has any synced items', async () => {
    queueChanges([{ upsert: [item('first')] }]);
    (getActiveProvider as Mock).mockResolvedValue(mockProvider({ getVault: unreachable() }));
    (getCachedVaultBlob as Mock).mockResolvedValue(null);

    expect((await getVaultItems()).data?.map((i) => i.id)).toEqual(['first']);
  });

  it('sends the queued changes once the provider answers a read', async () => {
    queueChanges([{ upsert: [item('saved-offline')] }]);
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([item('a')]), vaultSalt: 'salt', vaultVersion: 5 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    await getVaultItems();
    await backgroundSyncsSettled();

    expect(provider.updateVault).toHaveBeenCalledTimes(1);
    expect(writtenItems(provider).map((i) => i.id)).toEqual(['a', 'saved-offline']);
    expect(storedQueue).toBeNull();
  });

  it('does not try to sync while the provider is unreachable', async () => {
    queueChanges([{ upsert: [item('saved-offline')] }]);
    const provider = mockProvider({ getVault: unreachable() });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (getCachedVaultBlob as Mock).mockResolvedValue(null);

    await getVaultItems();

    // The read itself fails, and nothing else is attempted on its behalf.
    expect(provider.getVault).toHaveBeenCalledTimes(1);
  });
});

describe('syncPendingChanges()', () => {
  beforeEach(setUpUnlockedVault);

  it('sends queued changes and reports nothing left waiting', async () => {
    queueChanges([{ upsert: [item('x')] }, { upsert: [item('y')] }]);
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([]), vaultSalt: 'salt', vaultVersion: 1 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const status = await syncPendingChanges();

    expect(status).toEqual({ pendingCount: 0, lastError: null });
    expect(writtenItems(provider).map((i) => i.id)).toEqual(['x', 'y']);
  });

  it('keeps the queue, with the reason, when the provider is still unreachable', async () => {
    queueChanges([{ upsert: [item('x')] }], null);
    (getActiveProvider as Mock).mockResolvedValue(mockProvider({ getVault: unreachable() }));

    const status = await syncPendingChanges();

    expect(status).toEqual({ pendingCount: 1, lastError: 'Could not reach the Local Sync Server.' });
    expect(chrome.alarms.create).toHaveBeenCalled();
  });

  it('sends nothing while the vault is locked, and stops the retry alarm', async () => {
    queueChanges([{ upsert: [item('x')] }]);
    (getVaultKey as Mock).mockResolvedValue(null);
    const provider = mockProvider();
    (getActiveProvider as Mock).mockResolvedValue(provider);

    const status = await syncPendingChanges();

    expect(provider.updateVault).not.toHaveBeenCalled();
    expect(chrome.alarms.clear).toHaveBeenCalled();
    expect(status.pendingCount).toBe(1);
  });

  it('makes no write at all when nothing is queued', async () => {
    const provider = mockProvider();
    (getActiveProvider as Mock).mockResolvedValue(provider);

    await syncPendingChanges();

    expect(provider.getVault).not.toHaveBeenCalled();
    expect(provider.updateVault).not.toHaveBeenCalled();
  });

  it('runs after unlocking, sending changes left over from before the last lock', async () => {
    queueChanges([{ upsert: [item('saved-offline')] }]);
    const provider = mockProvider({
      getVault: vi.fn().mockResolvedValue({ encryptedVault: vaultBlob([item('a')]), vaultSalt: 'salt', vaultVersion: 3 }),
    });
    (getActiveProvider as Mock).mockResolvedValue(provider);
    (deriveVaultKey as Mock).mockResolvedValue('derived-key');

    expect(await unlockVault('correct-password')).toEqual({ success: true });
    await backgroundSyncsSettled();

    expect(provider.updateVault).toHaveBeenCalledTimes(1);
    expect(writtenItems(provider).map((i) => i.id)).toEqual(['a', 'saved-offline']);
  });
});

describe('withPendingChanges()', () => {
  beforeEach(setUpUnlockedVault);

  it('returns the blob untouched when nothing is queued', async () => {
    expect(await withPendingChanges(new Uint8Array(32), 'the-blob')).toBe('the-blob');
  });

  it('applies queued changes to the blob, so a backup includes them', async () => {
    queueChanges([{ upsert: [item('saved-offline')] }]);

    const blob = await withPendingChanges(new Uint8Array(32), vaultBlob([item('a')]));

    expect((JSON.parse(blob) as { items: VaultItem[] }).items.map((i) => i.id)).toEqual(['a', 'saved-offline']);
  });
});
