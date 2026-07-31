import type { BackgroundMessage, BackgroundResponse } from './messages';
import { unlockVault, lockVault, isVaultUnlocked } from './vaultManager';
import { login, register, logout, isAuthenticated } from '../services/authService';
import { clearVaultKey } from '../storage/sessionStorage';
import { clearCachedVaultBlob } from '../storage/localStorage';

// Note: Ensure manifest.json "background.service_worker" points to the compiled output of this file.

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // keep the message channel open for the async response
  });
}

export async function handleMessage(message: BackgroundMessage): Promise<BackgroundResponse> {
  try {
    switch (message.type) {
      case 'UNLOCK_VAULT': {
        const result = await unlockVault(message.masterPassword);
        if (result.success) return { success: true };
        return { success: false, error: { code: 'UNLOCK_FAILED', message: result.error || 'Failed to unlock vault.' } };
      }
      case 'LOCK_VAULT': {
        await lockVault();
        return { success: true };
      }
      case 'LOGIN': {
        const result = await login(message.email, message.password);
        if (result.success) return { success: true, data: result.data };
        return { success: false, error: result.error || { code: 'LOGIN_FAILED', message: 'Login failed.' } };
      }
      case 'REGISTER': {
        const result = await register(message.email, message.password, message.phone);
        if (result.success) return { success: true, data: result.data };
        return { success: false, error: result.error || { code: 'REGISTER_FAILED', message: 'Registration failed.' } };
      }
      case 'LOGOUT': {
        await logout();
        // Logging out should also fully lock the vault and clear the offline cache
        await clearVaultKey();
        await clearCachedVaultBlob();
        return { success: true };
      }
      case 'GET_AUTH_STATUS': {
        const authenticated = await isAuthenticated();
        return { success: true, data: { authenticated } };
      }
      case 'GET_VAULT_LOCK_STATUS': {
        const unlocked = await isVaultUnlocked();
        return { success: true, data: { unlocked } };
      }
      default:
        return { success: false, error: { code: 'UNKNOWN_MESSAGE', message: 'Unrecognized message type.' } };
    }
  } catch (error) {
    console.error('Background worker error handling message:', message.type, error);
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } };
  }
}
