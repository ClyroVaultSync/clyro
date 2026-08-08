import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { unlockVault, lockVault, isVaultUnlocked } from './vaultManager';
import { deriveVaultKey, decryptVault } from '@clyro/crypto';
import { getVaultKey, setVaultKey, clearVaultKey } from '../storage/sessionStorage';
import { getCachedVaultBlob, setCachedVaultBlob } from '../storage/localStorage';
import { apiGet } from '../services/apiClient';

vi.mock('@clyro/crypto', () => ({
  deriveVaultKey: vi.fn(),
  decryptVault: vi.fn(),
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

vi.mock('../services/apiClient', () => ({
  apiGet: vi.fn(),
}));

describe('vaultManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unlockVault() success path (server fetch succeeds, decrypt succeeds, key gets stored)', async () => {
    (apiGet as Mock).mockResolvedValue({
      success: true,
      data: { encryptedVault: 'encrypted-data', vaultSalt: 'salt123', vaultVersion: 1 },
    });
    (deriveVaultKey as Mock).mockResolvedValue('derived-key');
    (decryptVault as Mock).mockResolvedValue('decrypted-data');

    const result = await unlockVault('correct-password');

    expect(apiGet).toHaveBeenCalledWith('/vault', true);
    expect(setCachedVaultBlob).toHaveBeenCalledWith('encrypted-data', 1, 'salt123');
    expect(deriveVaultKey).toHaveBeenCalledWith('correct-password', 'salt123');
    expect(decryptVault).toHaveBeenCalledWith('derived-key', 'encrypted-data');
    expect(setVaultKey).toHaveBeenCalledWith('derived-key');
    
    expect(result).toEqual({ success: true });
  });

  it('unlockVault() with wrong password returns false and does not call setVaultKey', async () => {
    (apiGet as Mock).mockResolvedValue({
      success: true,
      data: { encryptedVault: 'encrypted-data', vaultSalt: 'salt123', vaultVersion: 1 },
    });
    (deriveVaultKey as Mock).mockResolvedValue('derived-key');
    (decryptVault as Mock).mockRejectedValue(new Error('Decryption failed'));

    const result = await unlockVault('wrong-password');

    expect(setVaultKey).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'Incorrect master password.' });
  });

  it('unlockVault() falls back to cache when the server call fails', async () => {
    (apiGet as Mock).mockResolvedValue({ success: false }); // network error or no connection
    (getCachedVaultBlob as Mock).mockResolvedValue({ encryptedVault: 'cached-encrypted', vaultSalt: 'cached-salt', vaultVersion: 1 });
    
    (deriveVaultKey as Mock).mockResolvedValue('derived-key');
    (decryptVault as Mock).mockResolvedValue('decrypted-data');

    const result = await unlockVault('correct-password');

    expect(apiGet).toHaveBeenCalledWith('/vault', true);
    expect(getCachedVaultBlob).toHaveBeenCalled();
    expect(deriveVaultKey).toHaveBeenCalledWith('correct-password', 'cached-salt');
    expect(decryptVault).toHaveBeenCalledWith('derived-key', 'cached-encrypted');
    expect(setVaultKey).toHaveBeenCalledWith('derived-key');
    
    expect(result).toEqual({ success: true });
  });

  it('unlockVault() fails cleanly when BOTH server and cache are unavailable', async () => {
    (apiGet as Mock).mockResolvedValue({ success: false });
    (getCachedVaultBlob as Mock).mockResolvedValue(null);

    const result = await unlockVault('password');

    expect(deriveVaultKey).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'No vault available. Connect to the internet to unlock for the first time.' });
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
});
