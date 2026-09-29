// Shared Types
export type User = { id: string };

export interface VaultItem {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultData {
  items: VaultItem[];
}

// --- Storage Provider contract (docs/ARCHITECTURE.md "Vault Synchronization") ---

export type SyncProviderId = 'local' | 'google-drive' | 'dropbox';

/** The opaque vault blob shape stored by every provider. `vaultSalt` is set once at
 * creation and is immutable afterward — it is never sent on an update (docs/API.md). */
export interface VaultPayload {
  encryptedVault: string;
  vaultVersion: number;
  vaultSalt: string;
}

export type VaultUpdatePayload = Omit<VaultPayload, 'vaultSalt'>;

export type SyncResult = { success: true } | { success: false; error: { code: string; message: string } };

/** Implemented by LocalProvider, GoogleDriveProvider, DropboxProvider (Phase 4).
 * `vaultManager.ts` and everything above it depends only on this interface, never
 * on which provider is active (docs/ARCHITECTURE.md → "Sync Provider"). */
export interface SyncProvider {
  id: SyncProviderId;
  getVault(): Promise<VaultPayload | null>;
  createVault(payload: VaultPayload): Promise<SyncResult>;
  updateVault(payload: VaultUpdatePayload): Promise<SyncResult>;
  deleteVault(): Promise<SyncResult>;
  isConnected(): Promise<boolean>;
}

// --- Extension <-> Website bridge (docs/API.md "Extension <-> Website Bridge") ---
//
// Status only, never secrets (D1): neither message nor response below may ever carry
// a credential, master password, vault key, or decrypted blob.

export type BridgeMessage = { type: 'GET_STATUS' } | { type: 'OPEN_VAULT' };

/** The actual on-the-wire response from the extension to GET_STATUS — it only ever
 * replies when installed. `provider` is null if setup hasn't been completed yet. */
export interface GetStatusResponse {
  installed: true;
  provider: SyncProviderId | null;
  locked: boolean;
}

/** The website's local view of extension status: `installed: false` is synthesized
 * by the website itself when the extension doesn't respond, never sent over the wire. */
export type ExtensionStatus = GetStatusResponse | { installed: false };

export interface OpenVaultResponse {
  opened: boolean;
}
