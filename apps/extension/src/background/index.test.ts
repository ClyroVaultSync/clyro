import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { handleMessage } from './index';
import { createVault, unlockVault, getVaultItems, saveVaultItems } from './vaultManager';
import { logout } from '../services/authService';
import { clearVaultKey } from '../storage/sessionStorage';
import { clearCachedVaultBlob } from '../storage/localStorage';
import type { BackgroundMessage } from './messages';

vi.mock('./vaultManager', () => ({
  createVault: vi.fn(),
  unlockVault: vi.fn(),
  lockVault: vi.fn(),
  isVaultUnlocked: vi.fn(),
  getVaultItems: vi.fn(),
  saveVaultItems: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: vi.fn(),
}));

vi.mock('../storage/sessionStorage', () => ({
  clearVaultKey: vi.fn(),
}));

vi.mock('../storage/localStorage', () => ({
  clearCachedVaultBlob: vi.fn(),
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
});
