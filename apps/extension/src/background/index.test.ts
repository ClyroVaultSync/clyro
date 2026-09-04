import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { handleMessage } from './index';
import { createVault, unlockVault, vaultExists, getVaultItems, saveVaultItems } from './vaultManager';
import { getActiveProviderId, initiatePairing, clearLocalConfig, getLocalConfig } from '../providers';
import { exportVault, importVault } from '../services/exportImport';
import { clearVaultKey } from '../storage/sessionStorage';
import { clearCachedVaultBlob } from '../storage/localStorage';
import type { BackgroundMessage } from './messages';

vi.mock('./vaultManager', () => ({
  createVault: vi.fn(),
  unlockVault: vi.fn(),
  lockVault: vi.fn(),
  isVaultUnlocked: vi.fn(),
  vaultExists: vi.fn(),
  getVaultItems: vi.fn(),
  saveVaultItems: vi.fn(),
}));

vi.mock('../providers', () => ({
  getActiveProviderId: vi.fn(),
  initiatePairing: vi.fn(),
  clearLocalConfig: vi.fn(),
  getLocalConfig: vi.fn(),
}));

vi.mock('../services/exportImport', () => ({
  exportVault: vi.fn(),
  importVault: vi.fn(),
}));

vi.mock('../storage/sessionStorage', () => ({
  clearVaultKey: vi.fn(),
}));

vi.mock('../storage/localStorage', () => ({
  clearCachedVaultBlob: vi.fn(),
}));

vi.mock('./bridge', () => ({}));

describe('Background message routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UNLOCK_VAULT routes correctly on success', async () => {
    (unlockVault as Mock).mockResolvedValue({ success: true });

    const response = await handleMessage({ type: 'UNLOCK_VAULT', masterPassword: 'test' });

    expect(unlockVault).toHaveBeenCalledWith('test');
    expect(response).toEqual({ success: true });
  });

  it('UNLOCK_VAULT routes correctly on failure', async () => {
    (unlockVault as Mock).mockResolvedValue({ success: false, error: 'Bad password' });

    const response = await handleMessage({ type: 'UNLOCK_VAULT', masterPassword: 'test' });

    expect(unlockVault).toHaveBeenCalledWith('test');
    expect(response).toEqual({ success: false, error: { code: 'UNLOCK_FAILED', message: 'Bad password' } });
  });

  it('unknown message type returns an error rather than crashing', async () => {
    const response = await handleMessage({ type: 'UNKNOWN_TYPE' } as unknown as BackgroundMessage);

    expect(response).toEqual({ success: false, error: { code: 'UNKNOWN_MESSAGE', message: 'Unrecognized message type.' } });
  });

  it('CREATE_VAULT routes correctly on success', async () => {
    (createVault as Mock).mockResolvedValue({ success: true });

    const response = await handleMessage({ type: 'CREATE_VAULT', masterPassword: 'test' });

    expect(createVault).toHaveBeenCalledWith('test');
    expect(response).toEqual({ success: true });
  });

  it('CREATE_VAULT routes correctly on failure', async () => {
    (createVault as Mock).mockResolvedValue({ success: false, error: 'A vault already exists on this storage provider.' });

    const response = await handleMessage({ type: 'CREATE_VAULT', masterPassword: 'test' });

    expect(response).toEqual({
      success: false,
      error: { code: 'CREATE_VAULT_FAILED', message: 'A vault already exists on this storage provider.' },
    });
  });

  it('GET_VAULT_EXISTS reflects vaultExists()', async () => {
    (vaultExists as Mock).mockResolvedValue(true);

    const response = await handleMessage({ type: 'GET_VAULT_EXISTS' });

    expect(response).toEqual({ success: true, data: { exists: true } });
  });

  it('GET_VAULT_ITEMS routes correctly on success', async () => {
    (getVaultItems as Mock).mockResolvedValue({ success: true, data: [] });

    const response = await handleMessage({ type: 'GET_VAULT_ITEMS' });

    expect(response).toEqual({ success: true, data: [] });
  });

  it('SAVE_VAULT_ITEMS forwards the items array', async () => {
    (saveVaultItems as Mock).mockResolvedValue({ success: true });

    const response = await handleMessage({ type: 'SAVE_VAULT_ITEMS', items: [] });

    expect(saveVaultItems).toHaveBeenCalledWith([]);
    expect(response).toEqual({ success: true });
  });

  it('FIND_MATCHING_CREDENTIALS filters vault items by domain', async () => {
    (getVaultItems as Mock).mockResolvedValue({
      success: true,
      data: [
        { id: '1', name: 'A', url: 'https://www.example.com/login', username: 'a', password: 'p', createdAt: '', updatedAt: '' },
        { id: '2', name: 'B', url: 'other.com', username: 'b', password: 'p', createdAt: '', updatedAt: '' },
      ],
    });

    const response = await handleMessage({ type: 'FIND_MATCHING_CREDENTIALS', domain: 'example.com' });

    expect(response.success).toBe(true);
    expect((response as { success: true; data: unknown[] }).data).toHaveLength(1);
  });

  it('SAVE_NEW_CREDENTIAL adds a new item when no duplicate exists', async () => {
    (getVaultItems as Mock).mockResolvedValue({ success: true, data: [] });
    (saveVaultItems as Mock).mockResolvedValue({ success: true });

    const response = await handleMessage({
      type: 'SAVE_NEW_CREDENTIAL',
      item: { name: 'Example', url: 'example.com', username: 'me', password: 'pw' },
    });

    expect(saveVaultItems).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ username: 'me', url: 'example.com' })])
    );
    expect(response).toEqual({ success: true, data: { updated: false } });
  });

  it('SAVE_NEW_CREDENTIAL updates the existing item instead of duplicating it', async () => {
    (getVaultItems as Mock).mockResolvedValue({
      success: true,
      data: [{ id: 'existing-1', name: 'Old', url: 'example.com', username: 'me', password: 'old', createdAt: 't0', updatedAt: 't0' }],
    });
    (saveVaultItems as Mock).mockResolvedValue({ success: true });

    const response = await handleMessage({
      type: 'SAVE_NEW_CREDENTIAL',
      item: { name: 'Example', url: 'example.com', username: 'me', password: 'newpw' },
    });

    const savedItems = (saveVaultItems as Mock).mock.calls[0][0];
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0]).toEqual(expect.objectContaining({ id: 'existing-1', password: 'newpw' }));
    expect(response).toEqual({ success: true, data: { updated: true } });
  });

  it('GET_SETUP_STATE reports no provider when none is configured', async () => {
    (getActiveProviderId as Mock).mockResolvedValue(null);

    const response = await handleMessage({ type: 'GET_SETUP_STATE' });

    expect(response).toEqual({ success: true, data: { providerId: null, baseUrl: null } });
  });

  it('GET_SETUP_STATE includes the base URL for a configured Local provider', async () => {
    (getActiveProviderId as Mock).mockResolvedValue('local');
    (getLocalConfig as Mock).mockResolvedValue({ baseUrl: 'http://localhost:8080', pairingToken: 't' });

    const response = await handleMessage({ type: 'GET_SETUP_STATE' });

    expect(response).toEqual({ success: true, data: { providerId: 'local', baseUrl: 'http://localhost:8080' } });
  });

  it('SET_LOCAL_PROVIDER pairs successfully', async () => {
    (initiatePairing as Mock).mockResolvedValue({ success: true });

    const response = await handleMessage({ type: 'SET_LOCAL_PROVIDER', baseUrl: 'http://localhost:8080' });

    expect(initiatePairing).toHaveBeenCalledWith('http://localhost:8080');
    expect(response).toEqual({ success: true });
  });

  it('SET_LOCAL_PROVIDER surfaces a pairing failure', async () => {
    (initiatePairing as Mock).mockResolvedValue({ success: false, error: 'Could not reach the Local Sync Server.' });

    const response = await handleMessage({ type: 'SET_LOCAL_PROVIDER', baseUrl: 'http://localhost:8080' });

    expect(response).toEqual({
      success: false,
      error: { code: 'PAIRING_FAILED', message: 'Could not reach the Local Sync Server.' },
    });
  });

  it('CLEAR_PROVIDER clears the provider config, vault key, and cache', async () => {
    const response = await handleMessage({ type: 'CLEAR_PROVIDER' });

    expect(clearLocalConfig).toHaveBeenCalled();
    expect(clearVaultKey).toHaveBeenCalled();
    expect(clearCachedVaultBlob).toHaveBeenCalled();
    expect(response).toEqual({ success: true });
  });

  it('EXPORT_VAULT returns the export file on success', async () => {
    const file = { version: 1, encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's', exportedAt: 't' };
    (exportVault as Mock).mockResolvedValue({ success: true, data: file });

    const response = await handleMessage({ type: 'EXPORT_VAULT' });

    expect(response).toEqual({ success: true, data: file });
  });

  it('IMPORT_VAULT forwards the file contents and password', async () => {
    (importVault as Mock).mockResolvedValue({ success: true });

    const response = await handleMessage({ type: 'IMPORT_VAULT', fileContents: '{}', masterPassword: 'pw' });

    expect(importVault).toHaveBeenCalledWith('{}', 'pw');
    expect(response).toEqual({ success: true });
  });
});
