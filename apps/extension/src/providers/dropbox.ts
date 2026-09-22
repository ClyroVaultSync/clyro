import type { SyncProvider, VaultPayload, VaultUpdatePayload, SyncResult } from '@clyro/shared-types';

export interface DropboxProviderConfig {
  connected: true;
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: number;
}

const CONFIG_KEY = 'dropboxProviderConfig';
const VAULT_FILE_PATH = '/clyro-vault.json';

// Public client identifier (no secret — PKCE doesn't use one), registered in the Dropbox App Console
// with "App folder" access, matching Google Drive's appDataFolder sandboxing.
const DROPBOX_CLIENT_ID = 'zbirn9mnentcoi4';

const AUTHORIZE_URL = 'https://www.dropbox.com/oauth2/authorize';
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const REVOKE_URL = 'https://api.dropboxapi.com/2/auth/token/revoke';
const DOWNLOAD_URL = 'https://content.dropboxapi.com/2/files/download';
const UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload';
const DELETE_URL = 'https://api.dropboxapi.com/2/files/delete_v2';

// Refresh a little before actual expiry so a request never races a token that
// expires mid-flight.
const ACCESS_TOKEN_SAFETY_MARGIN_MS = 60_000;

export async function setDropboxConfig(config: DropboxProviderConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}

export async function getDropboxConfig(): Promise<DropboxProviderConfig | null> {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  return (result[CONFIG_KEY] as DropboxProviderConfig) || null;
}

/** Best-effort server-side revoke (closest equivalent to Google's clearAllCachedAuthTokens) — a failure here must not block disconnecting locally. */
export async function clearDropboxConfig(): Promise<void> {
  const config = await getDropboxConfig();
  if (config?.accessToken) {
    try {
      await fetch(REVOKE_URL, { method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}` } });
    } catch {
      // best-effort only
    }
  }
  await chrome.storage.local.remove(CONFIG_KEY);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Dropbox request failed.';
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string; // only present on the initial authorization_code exchange
}

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`Dropbox token request failed (${res.status}).`);
  return (await res.json()) as TokenResponse;
}

/** Runs once during first-run setup: PKCE + chrome.identity.launchWebAuthFlow, since Dropbox isn't a
 * native chrome.identity.getAuthToken provider the way Google is. */
export async function connectDropbox(): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectUri = chrome.identity.getRedirectURL();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authorizeUrl = new URL(AUTHORIZE_URL);
    authorizeUrl.searchParams.set('client_id', DROPBOX_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    // Required for Dropbox to return a refresh_token alongside the access_token.
    authorizeUrl.searchParams.set('token_access_type', 'offline');

    const redirectedTo = await chrome.identity.launchWebAuthFlow({ url: authorizeUrl.toString(), interactive: true });
    const code = redirectedTo ? new URL(redirectedTo).searchParams.get('code') : null;
    if (!code) throw new Error('Dropbox authorization was cancelled.');

    const tokens = await requestToken({
      grant_type: 'authorization_code',
      code,
      client_id: DROPBOX_CLIENT_ID,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });
    if (!tokens.refresh_token) throw new Error('Dropbox did not return a refresh token.');

    await setDropboxConfig({
      connected: true,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

/** Reuses the cached access token until it's near expiry, then refreshes via the stored refresh token — the closest analogue to chrome.identity's own token cache, which Dropbox has no equivalent of. */
async function getValidAccessToken(): Promise<string> {
  const config = await getDropboxConfig();
  if (!config) throw new Error('Not connected to Dropbox.');

  const stillValid =
    config.accessToken && config.accessTokenExpiresAt && config.accessTokenExpiresAt - ACCESS_TOKEN_SAFETY_MARGIN_MS > Date.now();
  if (stillValid) return config.accessToken as string;

  const tokens = await requestToken({
    grant_type: 'refresh_token',
    refresh_token: config.refreshToken,
    client_id: DROPBOX_CLIENT_ID,
  });
  const accessTokenExpiresAt = Date.now() + tokens.expires_in * 1000;
  await setDropboxConfig({ ...config, accessToken: tokens.access_token, accessTokenExpiresAt });
  return tokens.access_token;
}

/** Wraps fetch with the current Dropbox token, retrying once with a forced refresh on a 401. */
async function authorizedFetch(url: string, init?: RequestInit): Promise<Response> {
  let token = await getValidAccessToken();
  let res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });

  if (res.status === 401) {
    const config = await getDropboxConfig();
    if (!config) throw new Error('Not connected to Dropbox.');
    const tokens = await requestToken({ grant_type: 'refresh_token', refresh_token: config.refreshToken, client_id: DROPBOX_CLIENT_ID });
    await setDropboxConfig({ ...config, accessToken: tokens.access_token, accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000 });
    token = tokens.access_token;
    res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
  }

  return res;
}

/** Content endpoints (upload/download) take their JSON args via this header, not the body or query string. */
function apiArgHeader(args: object): Record<string, string> {
  return { 'Dropbox-API-Arg': JSON.stringify(args) };
}

/** Dropbox's endpoint-specific errors always come back as HTTP 409 with a JSON body; error_summary is prefix-matchable, never exact-matchable (Dropbox appends detail to it). */
async function readErrorSummary(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error_summary === 'string' ? body.error_summary : '';
  } catch {
    return '';
  }
}

/** Thrown by uploadFile() on a path/conflict 409 so callers can translate it to SyncResult's CONFLICT code without confusing it with any other failure. */
class DropboxConflictError extends Error {}

/** Returns null (not a thrown error) when the path doesn't exist, so callers can treat "no vault yet" as a normal case rather than a hard failure. */
async function downloadFile(path: string): Promise<{ payload: VaultPayload; rev: string } | null> {
  const res = await authorizedFetch(DOWNLOAD_URL, { method: 'POST', headers: apiArgHeader({ path }) });

  if (res.status === 409) {
    const summary = await readErrorSummary(res);
    if (summary.startsWith('path/not_found') || summary.startsWith('path_lookup/not_found')) return null;
    throw new Error(`Dropbox API error while downloading the vault file: ${summary}`);
  }
  if (!res.ok) throw new Error(`Dropbox API error (${res.status}) while downloading the vault file.`);

  const resultHeader = res.headers.get('Dropbox-API-Result');
  const rev = resultHeader ? (JSON.parse(resultHeader).rev as string) : '';
  const payload = (await res.json()) as VaultPayload;
  return { payload, rev };
}

/** mode 'add' fails atomically (path/conflict) if the file already exists; mode {tag:'update', rev} fails atomically if `rev` is stale — Dropbox's true compare-and-swap, unlike Drive. */
async function uploadFile(path: string, mode: 'add' | { tag: 'update'; rev: string }, payload: VaultPayload): Promise<{ rev: string }> {
  const dropboxMode = mode === 'add' ? 'add' : { '.tag': 'update', update: mode.rev };
  const res = await authorizedFetch(UPLOAD_URL, {
    method: 'POST',
    headers: { ...apiArgHeader({ path, mode: dropboxMode, autorename: false, mute: true }), 'Content-Type': 'application/octet-stream' },
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    const summary = await readErrorSummary(res);
    if (summary.startsWith('path/conflict')) throw new DropboxConflictError(summary);
    throw new Error(`Dropbox API error while writing the vault file: ${summary}`);
  }
  if (!res.ok) throw new Error(`Dropbox API error (${res.status}) while writing the vault file.`);

  const body = await res.json();
  return { rev: body.rev as string };
}

/**
 * Talks to the Dropbox file API, storing the vault as a single file in the app's
 * sandboxed App Folder (docs/ARCHITECTURE.md "Vault Synchronization"). Unlike
 * Google Drive, Dropbox's upload endpoint supports a true atomic compare-and-swap
 * (`mode: update` + `rev`), so a write racing another is rejected by Dropbox itself
 * rather than by a check this provider performs. updateVault() still compares
 * `vaultVersion` as well, because `rev` alone cannot tell whether the caller's
 * version was computed against the revision being replaced. Either rejection
 * surfaces as CONFLICT, which vaultManager's applyVaultChange() re-applies and
 * retries. See knowledge/Features/Local-First Architecture.md.
 */
export class DropboxProvider implements SyncProvider {
  id = 'dropbox' as const;

  async getVault(): Promise<VaultPayload | null> {
    const current = await downloadFile(VAULT_FILE_PATH);
    return current?.payload ?? null;
  }

  async createVault(payload: VaultPayload): Promise<SyncResult> {
    try {
      await uploadFile(VAULT_FILE_PATH, 'add', payload);
      return { success: true };
    } catch (error) {
      if (error instanceof DropboxConflictError) {
        return { success: false, error: { code: 'CONFLICT', message: 'A vault already exists on Dropbox.' } };
      }
      return { success: false, error: { code: 'DROPBOX_ERROR', message: errorMessage(error) } };
    }
  }

  async updateVault(payload: VaultUpdatePayload): Promise<SyncResult> {
    try {
      const current = await downloadFile(VAULT_FILE_PATH);
      if (!current) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'No vault exists on Dropbox yet.' } };
      }

      // The `rev` compare-and-swap below only guards this download→upload window; it
      // says nothing about whether the caller's vaultVersion was computed from this
      // same revision. Without this check a write based on a version that has since
      // moved uploads cleanly against a current `rev` and silently overwrites the
      // device that moved it — the version check is what turns that into a conflict
      // the caller can re-fetch and retry against.
      if (current.payload.vaultVersion >= payload.vaultVersion) {
        return { success: false, error: { code: 'CONFLICT', message: 'Vault was modified elsewhere; please refresh and try again.' } };
      }

      await uploadFile(VAULT_FILE_PATH, { tag: 'update', rev: current.rev }, { ...payload, vaultSalt: current.payload.vaultSalt });
      return { success: true };
    } catch (error) {
      if (error instanceof DropboxConflictError) {
        return { success: false, error: { code: 'CONFLICT', message: 'Vault was modified elsewhere; please refresh and try again.' } };
      }
      return { success: false, error: { code: 'DROPBOX_ERROR', message: errorMessage(error) } };
    }
  }

  async deleteVault(): Promise<SyncResult> {
    try {
      const res = await authorizedFetch(DELETE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: VAULT_FILE_PATH }),
      });

      if (res.status === 409) {
        const summary = await readErrorSummary(res);
        if (!summary.startsWith('path/not_found') && !summary.startsWith('path_lookup/not_found')) {
          throw new Error(`Dropbox API error while deleting the vault file: ${summary}`);
        }
      } else if (!res.ok) {
        throw new Error(`Dropbox API error (${res.status}) while deleting the vault file.`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: { code: 'DROPBOX_ERROR', message: errorMessage(error) } };
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await getValidAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}
