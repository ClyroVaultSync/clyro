import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setVaultKey, getVaultKey, clearVaultKey } from './sessionStorage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockStorage = new Map<string, any>();

global.chrome = {
  storage: {
    session: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set: vi.fn(async (items: Record<string, any>) => {
        for (const [key, value] of Object.entries(items)) {
          mockStorage.set(key, value);
        }
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: vi.fn(async (keys: string | string[] | null) => {
        if (typeof keys === 'string') {
          return { [keys]: mockStorage.get(keys) };
        }
        return Object.fromEntries(mockStorage.entries());
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') {
          mockStorage.delete(keys);
        }
      }),
    },
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('sessionStorage', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  it('sets and gets vault key byte-for-byte correctly', async () => {
    const originalKey = new Uint8Array([1, 2, 3, 255, 0, 128]);
    await setVaultKey(originalKey);
    
    const retrievedKey = await getVaultKey();
    expect(retrievedKey).not.toBeNull();
    expect(retrievedKey).toBeInstanceOf(Uint8Array);
    expect(retrievedKey).toEqual(originalKey);
  });

  it('returns null if no vault key is set', async () => {
    expect(await getVaultKey()).toBeNull();
  });

  it('clearVaultKey removes the key', async () => {
    const originalKey = new Uint8Array([1, 2, 3]);
    await setVaultKey(originalKey);
    await clearVaultKey();
    
    expect(await getVaultKey()).toBeNull();
  });
});
