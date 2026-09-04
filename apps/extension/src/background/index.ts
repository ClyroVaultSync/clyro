import type { BackgroundMessage, BackgroundResponse } from './messages';
import { createVault, unlockVault, lockVault, isVaultUnlocked, vaultExists, getVaultItems, saveVaultItems } from './vaultManager';
import { getActiveProviderId, initiatePairing, clearLocalConfig, getLocalConfig } from '../providers';
import { exportVault, importVault } from '../services/exportImport';
import { clearVaultKey } from '../storage/sessionStorage';
import { clearCachedVaultBlob } from '../storage/localStorage';
import type { VaultItem } from '@clyro/shared-types';
import './bridge';

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
      case 'GET_SETUP_STATE': {
        const providerId = await getActiveProviderId();
        const config = providerId === 'local' ? await getLocalConfig() : null;
        return { success: true, data: { providerId, baseUrl: config?.baseUrl ?? null } };
      }
      case 'SET_LOCAL_PROVIDER': {
        const result = await initiatePairing(message.baseUrl);
        if (result.success) return { success: true };
        return { success: false, error: { code: 'PAIRING_FAILED', message: result.error || 'Failed to pair with the Local Sync Server.' } };
      }
      case 'CLEAR_PROVIDER': {
        await clearLocalConfig();
        await clearVaultKey();
        await clearCachedVaultBlob();
        return { success: true };
      }
      case 'EXPORT_VAULT': {
        const result = await exportVault();
        if (result.success) return { success: true, data: result.data };
        return { success: false, error: { code: 'EXPORT_FAILED', message: result.error || 'Failed to export vault.' } };
      }
      case 'IMPORT_VAULT': {
        const result = await importVault(message.fileContents, message.masterPassword);
        if (result.success) return { success: true };
        return { success: false, error: { code: 'IMPORT_FAILED', message: result.error || 'Failed to import vault.' } };
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
