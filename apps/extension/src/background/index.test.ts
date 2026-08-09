import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { handleMessage } from './index';
import { createVault, unlockVault, vaultExists, getVaultItems, saveVaultItems } from './vaultManager';
import { logout } from '../services/authService';
import { getDevices, revokeDevice } from '../services/deviceService';
import { getSessions, revokeSession, logoutAll } from '../services/sessionService';
import { clearVaultKey } from '../storage/sessionStorage';
import { clearCachedVaultBlob, clearAuthTokens } from '../storage/localStorage';
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

vi.mock('../services/authService', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: vi.fn(),
}));

vi.mock('../services/deviceService', () => ({
  getDevices: vi.fn(),
  revokeDevice: vi.fn(),
}));

vi.mock('../services/sessionService', () => ({
  getSessions: vi.fn(),
  revokeSession: vi.fn(),
  logoutAll: vi.fn(),
}));

vi.mock('../storage/sessionStorage', () => ({
  clearVaultKey: vi.fn(),
}));

vi.mock('../storage/localStorage', () => ({
  clearCachedVaultBlob: vi.fn(),
  clearAuthTokens: vi.fn(),
}));

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

  it('LOGOUT clears auth tokens, vault key, and cache', async () => {
    const response = await handleMessage({ type: 'LOGOUT' });
    
    expect(logout).toHaveBeenCalled();
    expect(clearVaultKey).toHaveBeenCalled();
    expect(clearCachedVaultBlob).toHaveBeenCalled();
    expect(response).toEqual({ success: true });
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
    (createVault as Mock).mockResolvedValue({ success: false, error: 'A vault already exists for this account.' });

    const response = await handleMessage({ type: 'CREATE_VAULT', masterPassword: 'test' });

    expect(response).toEqual({ success: false, error: { code: 'CREATE_VAULT_FAILED', message: 'A vault already exists for this account.' } });
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

  it('GET_DEVICES returns the device list', async () => {
    (getDevices as Mock).mockResolvedValue({ success: true, data: { devices: [{ id: 'd1' }] } });

    const response = await handleMessage({ type: 'GET_DEVICES' });

    expect(response).toEqual({ success: true, data: { devices: [{ id: 'd1' }] } });
  });

  it('REVOKE_DEVICE forwards the deviceId', async () => {
    (revokeDevice as Mock).mockResolvedValue({ success: true, data: { message: 'ok' } });

    const response = await handleMessage({ type: 'REVOKE_DEVICE', deviceId: 'd1' });

    expect(revokeDevice).toHaveBeenCalledWith('d1');
    expect(response).toEqual({ success: true, data: { message: 'ok' } });
  });

  it('GET_SESSIONS returns the session list', async () => {
    (getSessions as Mock).mockResolvedValue({ success: true, data: { sessions: [{ id: 's1' }] } });

    const response = await handleMessage({ type: 'GET_SESSIONS' });

    expect(response).toEqual({ success: true, data: { sessions: [{ id: 's1' }] } });
  });

  it('REVOKE_SESSION forwards the sessionId', async () => {
    (revokeSession as Mock).mockResolvedValue({ success: true, data: { message: 'ok' } });

    const response = await handleMessage({ type: 'REVOKE_SESSION', sessionId: 's1' });

    expect(revokeSession).toHaveBeenCalledWith('s1');
    expect(response).toEqual({ success: true, data: { message: 'ok' } });
  });

  it('LOGOUT_ALL clears the vault key, cache, and auth tokens on success', async () => {
    (logoutAll as Mock).mockResolvedValue({ success: true });

    const response = await handleMessage({ type: 'LOGOUT_ALL' });

    expect(clearVaultKey).toHaveBeenCalled();
    expect(clearCachedVaultBlob).toHaveBeenCalled();
    expect(clearAuthTokens).toHaveBeenCalled();
    expect(response).toEqual({ success: true });
  });

  it('LOGOUT_ALL does NOT clear local state if the server call fails', async () => {
    (logoutAll as Mock).mockResolvedValue({ success: false, error: { code: 'NETWORK_ERROR', message: 'offline' } });

    const response = await handleMessage({ type: 'LOGOUT_ALL' });

    expect(clearVaultKey).not.toHaveBeenCalled();
    expect(response).toEqual({ success: false, error: { code: 'NETWORK_ERROR', message: 'offline' } });
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
});
