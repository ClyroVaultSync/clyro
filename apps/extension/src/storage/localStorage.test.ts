import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setCachedVaultBlob, getCachedVaultBlob, clearCachedVaultBlob } from './localStorage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockStorage = new Map<string, any>();

global.chrome = {
  storage: {
    local: {
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
        if (Array.isArray(keys)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result: Record<string, any> = {};
          for (const key of keys) {
            if (mockStorage.has(key)) result[key] = mockStorage.get(key);
          }
          return result;
        }
        return Object.fromEntries(mockStorage.entries());
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') {
          mockStorage.delete(keys);
        } else {
          for (const key of keys) {
            mockStorage.delete(key);
          }
        }
      }),
    },
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('localStorage', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  it('caches vault blob and clears it', async () => {
    await setCachedVaultBlob('encrypted-blob', 1, 'salt-123');
    const cached = await getCachedVaultBlob();

    expect(cached).toEqual({
      encryptedVault: 'encrypted-blob',
      vaultVersion: 1,
      vaultSalt: 'salt-123',
    });

    await clearCachedVaultBlob();
    expect(await getCachedVaultBlob()).toBeNull();
  });
});
