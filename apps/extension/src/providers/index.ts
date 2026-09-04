import type { SyncProvider, SyncProviderId } from '@clyro/shared-types';
import { LocalProvider, getLocalConfig } from './local';

/**
 * The one active SyncProvider, or null if setup hasn't been completed yet.
 * Only 'local' is implemented — Google Drive and Dropbox are a later pass.
 */
export async function getActiveProvider(): Promise<SyncProvider | null> {
  const config = await getLocalConfig();
  if (config) return new LocalProvider(config);
  return null;
}

export async function getActiveProviderId(): Promise<SyncProviderId | null> {
  const provider = await getActiveProvider();
  return provider?.id ?? null;
}

export { initiatePairing } from './pairing';
export { clearLocalConfig, getLocalConfig } from './local';
