import type { SyncProvider, VaultPayload, VaultUpdatePayload, SyncResult } from '@clyro/shared-types';

export interface LocalProviderConfig {
  baseUrl: string;
  pairingToken: string;
}

const CONFIG_KEY = 'localProviderConfig';

export async function setLocalConfig(config: LocalProviderConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}

export async function getLocalConfig(): Promise<LocalProviderConfig | null> {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  return (result[CONFIG_KEY] as LocalProviderConfig) || null;
}

export async function clearLocalConfig(): Promise<void> {
  await chrome.storage.local.remove(CONFIG_KEY);
}

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

async function request<T>(config: LocalProviderConfig, path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${config.baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.pairingToken}`,
        ...(init?.headers || {}),
      },
    });
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, error: { code: 'NETWORK_ERROR', message: 'Could not reach the Local Sync Server.' } };
  }
}

/** Talks to the real Local Sync Server API in docs/API.md — pairing-token auth, optimistic-concurrency vault storage. */
export class LocalProvider implements SyncProvider {
  id = 'local' as const;

  constructor(private config: LocalProviderConfig) {}

  async getVault(): Promise<VaultPayload | null> {
    const res = await request<VaultPayload>(this.config, '/vault');
    if (res.success) return res.data;
    if (res.error.code === 'NOT_FOUND') return null;
    throw new Error(res.error.message);
  }

  async createVault(payload: VaultPayload): Promise<SyncResult> {
    const res = await request(this.config, '/vault', { method: 'POST', body: JSON.stringify(payload) });
    if (res.success) return { success: true };
    return { success: false, error: res.error };
  }

  async updateVault(payload: VaultUpdatePayload): Promise<SyncResult> {
    const res = await request(this.config, '/vault', { method: 'PUT', body: JSON.stringify(payload) });
    if (res.success) return { success: true };
    return { success: false, error: res.error };
  }

  async deleteVault(): Promise<SyncResult> {
    const res = await request(this.config, '/vault', { method: 'DELETE' });
    if (res.success) return { success: true };
    return { success: false, error: res.error };
  }

  async isConnected(): Promise<boolean> {
    const res = await request(this.config, '/vault/metadata');
    return res.success || res.error.code === 'NOT_FOUND';
  }
}
