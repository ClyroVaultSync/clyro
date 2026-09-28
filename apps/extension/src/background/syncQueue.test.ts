import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readPendingChanges,
  writePendingChanges,
  clearPendingChanges,
  getSyncStatus,
  withSyncLock,
  SYNC_RETRY_ALARM,
} from './syncQueue';
import type { VaultChange } from './vaultManager';

// Real @clyro/crypto on purpose: the point of these tests is what actually lands in storage.

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
  alarms: {
    create: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(true),
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

function randomKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

const change: VaultChange = {
  upsert: [
    {
      id: 'a',
      name: 'GitHub',
      url: 'github.com',
      username: 'me@example.com',
      password: 'hunter2-plaintext',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('syncQueue', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  it('stores the queued changes only as ciphertext, and reads them back with the same key', async () => {
    const key = randomKey();

    await writePendingChanges(key, [change, { deleteIds: ['b'] }], null);

    const stored = JSON.stringify(mockStorage.get('pendingChanges'));
    expect(stored).not.toContain('hunter2-plaintext');
    expect(stored).not.toContain('me@example.com');
    expect(await readPendingChanges(key)).toEqual([change, { deleteIds: ['b'] }]);
  });

  it('keeps the count and last error readable without the key', async () => {
    await writePendingChanges(randomKey(), [change, change], 'Could not reach Google Drive.');

    expect(await getSyncStatus()).toEqual({ pendingCount: 2, lastError: 'Could not reach Google Drive.' });
  });

  it('reports nothing pending when there is no queue', async () => {
    expect(await getSyncStatus()).toEqual({ pendingCount: 0, lastError: null });
    expect(await readPendingChanges(randomKey())).toEqual([]);
  });

  it('discards a queue the unlocked vault key cannot decrypt', async () => {
    await writePendingChanges(randomKey(), [change], null);

    expect(await readPendingChanges(randomKey())).toEqual([]);
    expect(mockStorage.has('pendingChanges')).toBe(false);
  });

  it('writing an empty queue clears it and stops the retry alarm', async () => {
    const key = randomKey();
    await writePendingChanges(key, [change], 'offline');

    await writePendingChanges(key, [], null);

    expect(mockStorage.has('pendingChanges')).toBe(false);
    expect(chrome.alarms.clear).toHaveBeenCalledWith(SYNC_RETRY_ALARM);
  });

  it('schedules a retry only when a failed attempt is recorded', async () => {
    const key = randomKey();

    await writePendingChanges(key, [change], null);
    expect(chrome.alarms.create).not.toHaveBeenCalled();

    await writePendingChanges(key, [change], 'Could not reach the Local Sync Server.');
    expect(chrome.alarms.create).toHaveBeenCalledWith(SYNC_RETRY_ALARM, { periodInMinutes: 1 });
  });

  it('tells open extension pages when an attempt fails or the queue empties, not while a save is in flight', async () => {
    const key = randomKey();

    await writePendingChanges(key, [change], null);
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();

    await writePendingChanges(key, [change], 'Could not reach Dropbox.');
    await clearPendingChanges();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SYNC_STATUS_CHANGED' });
  });

  it('withSyncLock() runs tasks one at a time, in the order they arrived', async () => {
    const events: string[] = [];
    let releaseFirst: () => void = () => {};

    const first = withSyncLock(async () => {
      events.push('first:start');
      await new Promise<void>((resolve) => (releaseFirst = resolve));
      events.push('first:end');
    });
    const second = withSyncLock(async () => {
      events.push('second:start');
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual(['first:start']);
    releaseFirst();
    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('withSyncLock() keeps going after a task fails', async () => {
    await expect(withSyncLock(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');

    expect(await withSyncLock(async () => 'ran')).toBe('ran');
  });
});
