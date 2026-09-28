import type { BackgroundMessage, BackgroundResponse } from './messages';
import {
  createVault,
  unlockVault,
  lockVault,
  isVaultUnlocked,
  vaultExists,
  getVaultItems,
  applyVaultChange,
  syncPendingChanges,
} from './vaultManager';
import { getSyncStatus, clearPendingChanges, SYNC_RETRY_ALARM } from './syncQueue';
import {
  getActiveProviderId,
  initiatePairing,
  clearLocalConfig,
  getLocalConfig,
  connectGoogleDrive,
  clearGoogleDriveConfig,
  connectDropbox,
  clearDropboxConfig,
} from '../providers';
import { exportVault, importVault } from '../services/exportImport';
import { copyToClipboard } from './clipboard';
import { clearVaultKey, setPendingCredential, takePendingCredential } from '../storage/sessionStorage';
import { clearCachedVaultBlob } from '../storage/localStorage';
import type { VaultItem } from '@clyro/shared-types';
import './bridge';

// Note: Ensure manifest.json "background.service_worker" points to the compiled output of this file.

/**
 * Tells any other open extension page (e.g. a vault.html tab left open in another
 * window) that the vault just became inaccessible here, so it can drop whatever
 * decrypted items it's holding in memory instead of continuing to display them.
 * Rejects harmlessly when nothing is listening — that's not an error case.
 */
function broadcastVaultLocked(): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
  chrome.runtime.sendMessage({ type: 'VAULT_LOCKED' }).catch(() => {});
}

/**
 * Force-closes any open vault.html tab when the storage provider changes — that
 * tab's whole context (which provider, which decrypted vault) is now stale, and
 * closing it outright is simpler and more reliable than asking it to update itself:
 * it works even if that tab is still running an older build of the extension's
 * JS than the one that just ran this code (confirmed happening in practice —
 * reloading the extension does not refresh the JS already running in a tab that
 * was open before the reload).
 */
async function closeOpenVaultTabs(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;
  const tabs = await chrome.tabs.query({ url: `${chrome.runtime.getURL('vault.html')}*` });
  const tabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);
  if (tabIds.length > 0) await chrome.tabs.remove(tabIds);
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // keep the message channel open for the async response
  });
}

// Registered at the top level so the alarm can wake a stopped service worker.
if (typeof chrome !== 'undefined' && chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== SYNC_RETRY_ALARM) return;
    syncPendingChanges().catch((error) => console.warn('Retry alarm: sync failed.', error));
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
        broadcastVaultLocked();
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
      case 'SAVE_VAULT_CHANGE': {
        const result = await applyVaultChange(message.change);
        if (result.success) return { success: true, data: { synced: Boolean(result.synced) } };
        return { success: false, error: { code: 'SAVE_ITEMS_FAILED', message: result.error || 'Failed to save vault items.' } };
      }
      case 'GET_SYNC_STATUS': {
        const status = await getSyncStatus();
        return { success: true, data: { ...status, providerId: await getActiveProviderId() } };
      }
      case 'SYNC_NOW': {
        const status = await syncPendingChanges();
        return { success: true, data: { ...status, providerId: await getActiveProviderId() } };
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
        // This stays a read-then-decide, so two devices saving the same site+username at the same
        // moment can still produce a duplicate entry — never a lost one, since the upsert below is
        // applied to whatever the vault holds at write time.
        const duplicate = existing.data.find(
          (item) => domainMatches(item.url, extractDomain(message.item.url)) && item.username === message.item.username
        );
        const now = new Date().toISOString();
        const item: VaultItem = duplicate
          ? { ...duplicate, ...message.item, updatedAt: now }
          : { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...message.item };
        const saveResult = await applyVaultChange({ upsert: [item] });
        if (saveResult.success) return { success: true, data: { updated: Boolean(duplicate), synced: Boolean(saveResult.synced) } };
        return { success: false, error: { code: 'SAVE_NEW_CREDENTIAL_FAILED', message: saveResult.error || 'Failed to save credential.' } };
      }
      case 'STASH_PENDING_CREDENTIAL': {
        await setPendingCredential(message.item);
        return { success: true };
      }
      case 'GET_PENDING_CREDENTIAL': {
        const pending = await takePendingCredential();
        if (!pending) return { success: true, data: null };

        // Only worth surfacing if it's actually new or the password changed — same
        // "same site + same username is an update" rule SAVE_NEW_CREDENTIAL already uses.
        const existing = await getVaultItems();
        const known = existing.success && existing.data ? existing.data : [];
        const match = known.find(
          (item) => domainMatches(item.url, extractDomain(pending.url)) && item.username === pending.username
        );
        if (match && match.password === pending.password) return { success: true, data: null };

        return { success: true, data: { url: pending.url, username: pending.username, password: pending.password } };
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
      case 'CONNECT_GOOGLE_DRIVE': {
        const result = await connectGoogleDrive();
        if (result.success) return { success: true };
        return { success: false, error: { code: 'GOOGLE_DRIVE_CONNECT_FAILED', message: result.error || 'Failed to connect to Google Drive.' } };
      }
      case 'CONNECT_DROPBOX': {
        const result = await connectDropbox();
        if (result.success) return { success: true };
        return { success: false, error: { code: 'DROPBOX_CONNECT_FAILED', message: result.error || 'Failed to connect to Dropbox.' } };
      }
      case 'CLEAR_PROVIDER': {
        await clearLocalConfig();
        await clearGoogleDriveConfig();
        await clearDropboxConfig();
        await clearVaultKey();
        await clearCachedVaultBlob();
        // Changes still waiting belong to the vault being disconnected from; the
        // confirm dialog before this warned how many would be lost.
        await clearPendingChanges();
        await closeOpenVaultTabs();
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
      case 'COPY_TO_CLIPBOARD': {
        const result = await copyToClipboard(message.text);
        if (result.success) return { success: true };
        return { success: false, error: { code: 'CLIPBOARD_WRITE_FAILED', message: 'Failed to copy to clipboard.' } };
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
