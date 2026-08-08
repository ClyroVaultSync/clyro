import type { BackgroundMessage, BackgroundResponse } from './messages';
import { createVault, unlockVault, lockVault, isVaultUnlocked, vaultExists, getVaultItems, saveVaultItems } from './vaultManager';
import { login, register, logout, isAuthenticated } from '../services/authService';
import { getDevices, revokeDevice } from '../services/deviceService';
import { getSessions, revokeSession, logoutAll } from '../services/sessionService';
import { clearVaultKey } from '../storage/sessionStorage';
import { clearCachedVaultBlob } from '../storage/localStorage';
import type { VaultItem } from '@clyro/shared-types';

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
      case 'CREATE_VAULT': {
        const result = await createVault(message.masterPassword);
        if (result.success) return { success: true };
        return { success: false, error: { code: 'CREATE_VAULT_FAILED', message: result.error || 'Failed to create vault.' } };
      }
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
      case 'GET_VAULT_EXISTS': {
        const exists = await vaultExists();
        return { success: true, data: { exists } };
      }
      case 'GET_VAULT_ITEMS': {
        const result = await getVaultItems();
        if (result.success) return { success: true, data: result.data };
        return { success: false, error: { code: 'GET_ITEMS_FAILED', message: result.error || 'Failed to get vault items.' } };
      }
      case 'SAVE_VAULT_ITEMS': {
        const result = await saveVaultItems(message.items);
        if (result.success) return { success: true };
        return { success: false, error: { code: 'SAVE_ITEMS_FAILED', message: result.error || 'Failed to save vault items.' } };
      }
      case 'GET_DEVICES': {
        const result = await getDevices();
        if (result.success) return { success: true, data: result.data };
        return { success: false, error: result.error || { code: 'GET_DEVICES_FAILED', message: 'Failed to fetch devices.' } };
      }
      case 'REVOKE_DEVICE': {
        const result = await revokeDevice(message.deviceId);
        if (result.success) return { success: true, data: result.data };
        return { success: false, error: result.error || { code: 'REVOKE_DEVICE_FAILED', message: 'Failed to revoke device.' } };
      }
      case 'GET_SESSIONS': {
        const result = await getSessions();
        if (result.success) return { success: true, data: result.data };
        return { success: false, error: result.error || { code: 'GET_SESSIONS_FAILED', message: 'Failed to fetch sessions.' } };
      }
      case 'REVOKE_SESSION': {
        const result = await revokeSession(message.sessionId);
        if (result.success) return { success: true, data: result.data };
        return { success: false, error: result.error || { code: 'REVOKE_SESSION_FAILED', message: 'Failed to revoke session.' } };
      }
      case 'LOGOUT_ALL': {
        const result = await logoutAll();
        if (!result.success) {
          return { success: false, error: result.error || { code: 'LOGOUT_ALL_FAILED', message: 'Failed to log out all sessions.' } };
        }
        // Mirrors LOGOUT: revoking every session invalidates this device's own tokens too.
        await clearVaultKey();
        await clearCachedVaultBlob();
        return { success: true };
      }
      case 'FIND_MATCHING_CREDENTIALS': {
        const result = await getVaultItems();
        if (!result.success || !result.data) {
          return { success: false, error: { code: 'FIND_MATCHING_CREDENTIALS_FAILED', message: result.error || 'Failed to read vault items.' } };
        }
        const matches = result.data.filter((item) => domainMatches(item.url, message.domain));
        return { success: true, data: matches };
      }
      case 'SAVE_NEW_CREDENTIAL': {
        const existing = await getVaultItems();
        if (!existing.success || !existing.data) {
          return { success: false, error: { code: 'SAVE_NEW_CREDENTIAL_FAILED', message: existing.error || 'Failed to read vault items.' } };
        }
        // Duplicate detection per docs/PRD.md: same site + same username is an update, not a new entry.
        const duplicate = existing.data.find(
          (item) => domainMatches(item.url, extractDomain(message.item.url)) && item.username === message.item.username
        );
        const now = new Date().toISOString();
        let nextItems: VaultItem[];
        if (duplicate) {
          nextItems = existing.data.map((item) =>
            item.id === duplicate.id ? { ...item, ...message.item, updatedAt: now } : item
          );
        } else {
          const newItem: VaultItem = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...message.item };
          nextItems = [...existing.data, newItem];
        }
        const saveResult = await saveVaultItems(nextItems);
        if (saveResult.success) return { success: true, data: { updated: Boolean(duplicate) } };
        return { success: false, error: { code: 'SAVE_NEW_CREDENTIAL_FAILED', message: saveResult.error || 'Failed to save credential.' } };
      }
      default:
        return { success: false, error: { code: 'UNKNOWN_MESSAGE', message: 'Unrecognized message type.' } };
    }
  } catch (error) {
    console.error('Background worker error handling message:', message.type, error);
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } };
  }
}

/** Strips a leading "www." so "www.example.com" and "example.com" are treated as the same site. */
function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

/** VaultItem.url may be a bare hostname or a full URL; extracts a comparable hostname either way. */
function extractDomain(url: string): string {
  try {
    return normalizeHost(new URL(url).hostname);
  } catch {
    return normalizeHost(url.split('/')[0]);
  }
}

function domainMatches(itemUrl: string, domain: string): boolean {
  return extractDomain(itemUrl) === normalizeHost(domain);
}
