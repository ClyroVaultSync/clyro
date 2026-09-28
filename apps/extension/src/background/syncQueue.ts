import { encryptVault, decryptVault } from '@clyro/crypto';
import { getPendingChangesRecord, setPendingChangesRecord, clearPendingChangesRecord } from '../storage/localStorage';
import type { VaultChange } from './vaultManager';

/**
 * The offline write queue: vault changes saved on this device that haven't
 * reached the storage provider yet, in the order they were made. Every save goes
 * through it (see applyVaultChange() in vaultManager.ts), so a change is stored
 * before any network call and survives the provider being unreachable, the
 * service worker being stopped, or the browser closing.
 *
 * The changes hold plaintext credentials, so they're encrypted with the vault
 * key before being persisted — the same rule as the vault cache
 * (docs/SECURITY.md). Reading them back therefore needs the vault unlocked.
 */

export interface SyncStatus {
  pendingCount: number;
  lastError: string | null;
}

/** Retries a failed sync once a minute until the queue is empty, or until the vault is locked. */
export const SYNC_RETRY_ALARM = 'clyro-sync-retry';

/**
 * The queued changes, oldest first. A queue this key can't decrypt was made
 * under a vault that has since been replaced (imported, on this or another
 * device), so it can never be applied — it's discarded rather than left to show
 * a permanent "waiting to sync" notice.
 */
export async function readPendingChanges(key: Uint8Array): Promise<VaultChange[]> {
  const record = await getPendingChangesRecord();
  if (!record) return [];

  try {
    return JSON.parse(await decryptVault(key, record.encryptedChanges)) as VaultChange[];
  } catch {
    console.warn(`readPendingChanges(): discarding ${record.count} queued change(s) that don't belong to the unlocked vault.`);
    await clearPendingChanges();
    return [];
  }
}

/**
 * Replaces the queue. `lastError` is why the latest attempt to send it failed,
 * or null if none has been made yet.
 *
 * Only a recorded failure schedules a retry and tells open pages. Every save
 * passes through here with null for the moment before it's sent; announcing that
 * would flash a "waiting to sync" notice on every ordinary online save.
 */
export async function writePendingChanges(key: Uint8Array, changes: VaultChange[], lastError: string | null): Promise<void> {
  if (changes.length === 0) {
    await clearPendingChanges();
    return;
  }

  const encryptedChanges = await encryptVault(key, JSON.stringify(changes));
  await setPendingChangesRecord({ encryptedChanges, count: changes.length, lastError });
  if (lastError !== null) {
    scheduleSyncRetry();
    broadcastSyncStatusChanged();
  }
}

export async function clearPendingChanges(): Promise<void> {
  await clearPendingChangesRecord();
  cancelSyncRetry();
  broadcastSyncStatusChanged();
}

/** Readable while the vault is locked — the count and error are stored outside the encrypted part. */
export async function getSyncStatus(): Promise<SyncStatus> {
  const record = await getPendingChangesRecord();
  return { pendingCount: record?.count ?? 0, lastError: record?.lastError ?? null };
}

let queueTail: Promise<unknown> = Promise.resolve();

/**
 * Runs `task` only after every task queued before it has finished. Every read-
 * modify-write of the queue, and every attempt to send it, goes through here —
 * otherwise two saves arriving together, or a save racing the retry alarm, could
 * each read the same queue and one would drop the other's change. Not reentrant:
 * a task must not call withSyncLock() and wait on the result.
 */
export function withSyncLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queueTail.then(task);
  queueTail = run.catch(() => {});
  return run;
}

export function cancelSyncRetry(): void {
  if (typeof chrome === 'undefined' || !chrome.alarms) return;
  chrome.alarms.clear(SYNC_RETRY_ALARM).catch(() => {});
}

function scheduleSyncRetry(): void {
  if (typeof chrome === 'undefined' || !chrome.alarms) return;
  chrome.alarms.create(SYNC_RETRY_ALARM, { periodInMinutes: 1 }).catch(() => {});
}

/** Lets an open vault tab refresh its "waiting to sync" notice. Rejects harmlessly when nothing is listening. */
function broadcastSyncStatusChanged(): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
  chrome.runtime.sendMessage({ type: 'SYNC_STATUS_CHANGED' }).catch(() => {});
}
