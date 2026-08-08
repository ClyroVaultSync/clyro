export type BackgroundMessage =
  | { type: 'CREATE_VAULT'; masterPassword: string }
  | { type: 'UNLOCK_VAULT'; masterPassword: string }
  | { type: 'LOCK_VAULT' }
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'REGISTER'; email: string; password: string; phone?: string }
  | { type: 'LOGOUT' }
  | { type: 'GET_AUTH_STATUS' }
  | { type: 'GET_VAULT_LOCK_STATUS' }
  | { type: 'GET_VAULT_ITEMS' }
  | { type: 'SAVE_VAULT_ITEMS'; items: import('@clyro/shared-types').VaultItem[] }
  | { type: 'GET_DEVICES' }
  | { type: 'REVOKE_DEVICE'; deviceId: string }
  | { type: 'GET_SESSIONS' }
  | { type: 'REVOKE_SESSION'; sessionId: string }
  | { type: 'LOGOUT_ALL' }
  | { type: 'FIND_MATCHING_CREDENTIALS'; domain: string }
  | { type: 'SAVE_NEW_CREDENTIAL'; item: { name: string; url: string; username: string; password: string; notes?: string } };

export type BackgroundResponse =
  | { success: true; data?: unknown }
  | { success: false; error: { code: string; message: string } };
