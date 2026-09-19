import type { SyncProvider, SyncProviderId } from '@clyro/shared-types';
import { LocalProvider, getLocalConfig } from './local';
import { GoogleDriveProvider, getGoogleDriveConfig } from './googleDrive';

/**
 * The one active SyncProvider, or null if setup hasn't been completed yet.
 * Dropbox is not implemented yet — a later pass.
 */
export async function getActiveProvider(): Promise<SyncProvider | null> {
  const localConfig = await getLocalConfig();
  if (localConfig) return new LocalProvider(localConfig);

  const googleDriveConfig = await getGoogleDriveConfig();
  if (googleDriveConfig) return new GoogleDriveProvider();

  return null;
}

export async function getActiveProviderId(): Promise<SyncProviderId | null> {
  const provider = await getActiveProvider();
  return provider?.id ?? null;
}

export { initiatePairing } from './pairing';
export { clearLocalConfig, getLocalConfig } from './local';
export { connectGoogleDrive, clearGoogleDriveConfig, getGoogleDriveConfig } from './googleDrive';
