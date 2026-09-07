export type BackgroundMessage =
  | { type: 'CREATE_VAULT'; masterPassword: string }
  | { type: 'UNLOCK_VAULT'; masterPassword: string }
  | { type: 'LOCK_VAULT' }
  | { type: 'GET_VAULT_LOCK_STATUS' }
  | { type: 'GET_VAULT_EXISTS' }
  | { type: 'GET_VAULT_ITEMS' }
  | { type: 'SAVE_VAULT_ITEMS'; items: import('@clyro/shared-types').VaultItem[] }
  | { type: 'FIND_MATCHING_CREDENTIALS'; domain: string }
  | { type: 'SAVE_NEW_CREDENTIAL'; item: { name: string; url: string; username: string; password: string; notes?: string } }
  | { type: 'STASH_PENDING_CREDENTIAL'; item: { url: string; username: string; password: string } }
  | { type: 'GET_PENDING_CREDENTIAL' }
  | { type: 'GET_SETUP_STATE' }
  | { type: 'SET_LOCAL_PROVIDER'; baseUrl: string }
  | { type: 'CLEAR_PROVIDER' }
  | { type: 'EXPORT_VAULT' }
  | { type: 'IMPORT_VAULT'; fileContents: string; masterPassword: string }
  | { type: 'COPY_TO_CLIPBOARD'; text: string };

export type BackgroundResponse =
  | { success: true; data?: unknown }
  | { success: false; error: { code: string; message: string } };
