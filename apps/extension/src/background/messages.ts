export type BackgroundMessage =
  | { type: 'UNLOCK_VAULT'; masterPassword: string }
  | { type: 'LOCK_VAULT' }
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'REGISTER'; email: string; password: string; phone?: string }
  | { type: 'LOGOUT' }
  | { type: 'GET_AUTH_STATUS' }
  | { type: 'GET_VAULT_LOCK_STATUS' }
  | { type: 'GET_VAULT_ITEMS' }
  | { type: 'SAVE_VAULT_ITEMS'; items: import('@clyro/shared-types').VaultItem[] };

export type BackgroundResponse =
  | { success: true; data?: unknown }
  | { success: false; error: { code: string; message: string } };
