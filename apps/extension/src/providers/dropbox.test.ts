import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DropboxProvider, connectDropbox, setDropboxConfig, getDropboxConfig, clearDropboxConfig } from './dropbox';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockStorage = new Map<string, any>();
const REDIRECT_URI = 'https://cdaicnajdmjjdmghjblobeegdbdniiif.chromiumapp.org/';

global.chrome = {
  storage: {
    local: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set: vi.fn(async (items: Record<string, any>) => {
        for (const [key, value] of Object.entries(items)) mockStorage.set(key, value);
      }),
      get: vi.fn(async (key: string) => ({ [key]: mockStorage.get(key) })),
      remove: vi.fn(async (key: string) => {
        mockStorage.delete(key);
      }),
    },
  },
  identity: {
    getRedirectURL: vi.fn(() => REDIRECT_URI),
    launchWebAuthFlow: vi.fn(),
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const validConfig = { connected: true as const, refreshToken: 'refresh-tok', accessToken: 'access-tok', accessTokenExpiresAt: 9999999999999 };

function jsonResponse(body: unknown, opts: { status?: number } = {}) {
  const status = opts.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

function downloadResponse(payload: unknown, rev: string) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === 'Dropbox-API-Result' ? JSON.stringify({ rev }) : null) },
    json: async () => payload,
  } as unknown as Response;
}

function notFoundResponse() {
  return jsonResponse({ error_summary: 'path/not_found/.', error: { '.tag': 'path' } }, { status: 409 });
}

function conflictResponse() {
  return jsonResponse({ error_summary: 'path/conflict/file/.', error: { '.tag': 'path' } }, { status: 409 });
}

describe('DropboxProvider', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
    (chrome.identity.getRedirectURL as ReturnType<typeof vi.fn>).mockReturnValue(REDIRECT_URI);
  });

  it('connectDropbox() completes the PKCE flow and stores the tokens', async () => {
    (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(`${REDIRECT_URI}?code=auth-code&state=xyz`);
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ access_token: 'access-tok', expires_in: 14400, refresh_token: 'refresh-tok' }));

    const result = await connectDropbox();

    expect(result).toEqual({ success: true });
    expect(await getDropboxConfig()).toMatchObject({ connected: true, refreshToken: 'refresh-tok', accessToken: 'access-tok' });

    const [{ url }] = (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mock.calls[0];
    const authUrl = new URL(url);
    expect(authUrl.searchParams.get('client_id')).toBe('zbirn9mnentcoi4');
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authUrl.searchParams.get('token_access_type')).toBe('offline');

    const [tokenUrl, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(tokenUrl).toBe('https://api.dropboxapi.com/oauth2/token');
    const body = init.body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('client_id')).toBe('zbirn9mnentcoi4');
    expect(body.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(body.get('code_verifier')?.length).toBeGreaterThanOrEqual(43);
  });

  it('connectDropbox() surfaces a failure when the user cancels', async () => {
    (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await connectDropbox();

    expect(result).toEqual({ success: false, error: 'Dropbox authorization was cancelled.' });
  });

  it('getVault() returns null when no vault file exists yet', async () => {
    await setDropboxConfig(validConfig);
    global.fetch = vi.fn().mockResolvedValue(notFoundResponse());
    const provider = new DropboxProvider();

    expect(await provider.getVault()).toBeNull();
  });

  it('getVault() downloads and returns the payload when the file exists', async () => {
    await setDropboxConfig(validConfig);
    global.fetch = vi.fn().mockResolvedValue(downloadResponse({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' }, 'rev-1'));
    const provider = new DropboxProvider();

    expect(await provider.getVault()).toEqual({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });
  });

  it('createVault() uploads with mode "add" when none exists', async () => {
    await setDropboxConfig(validConfig);
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ rev: 'rev-1' }));
    const provider = new DropboxProvider();

    const result = await provider.createVault({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });

    expect(result).toEqual({ success: true });
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://content.dropboxapi.com/2/files/upload');
    const arg = JSON.parse((init.headers as Record<string, string>)['Dropbox-API-Arg']);
    expect(arg).toMatchObject({ path: '/clyro-vault.json', mode: 'add', autorename: false });
  });

  it('createVault() returns CONFLICT when a vault file already exists', async () => {
    await setDropboxConfig(validConfig);
    global.fetch = vi.fn().mockResolvedValue(conflictResponse());
    const provider = new DropboxProvider();

    const result = await provider.createVault({ encryptedVault: 'e', vaultVersion: 1, vaultSalt: 's' });

    expect(result).toEqual({ success: false, error: { code: 'CONFLICT', message: 'A vault already exists on Dropbox.' } });
  });

  it('updateVault() uploads with mode:update and the current rev when versions are in order', async () => {
    await setDropboxConfig(validConfig);
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(downloadResponse({ encryptedVault: 'old', vaultVersion: 1, vaultSalt: 's' }, 'rev-1'))
      .mockResolvedValueOnce(jsonResponse({ rev: 'rev-2' }));
    const provider = new DropboxProvider();

    const result = await provider.updateVault({ encryptedVault: 'new', vaultVersion: 2 });

    expect(result).toEqual({ success: true });
    const [, uploadInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    const arg = JSON.parse((uploadInit.headers as Record<string, string>)['Dropbox-API-Arg']);
    expect(arg.mode).toEqual({ '.tag': 'update', update: 'rev-1' });
    expect(uploadInit.body).toBe(JSON.stringify({ encryptedVault: 'new', vaultVersion: 2, vaultSalt: 's' }));
  });

  it('updateVault() returns CONFLICT on a write race without attempting a conflict-copy upload', async () => {
    await setDropboxConfig(validConfig);
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(downloadResponse({ encryptedVault: 'newer', vaultVersion: 3, vaultSalt: 's' }, 'rev-3'))
      .mockResolvedValueOnce(conflictResponse());
    const provider = new DropboxProvider();

    const result = await provider.updateVault({ encryptedVault: 'stale-write', vaultVersion: 2 });

    expect(result).toEqual({
      success: false,
      error: { code: 'CONFLICT', message: 'Vault was modified elsewhere; please refresh and try again.' },
    });
    expect(fetch).toHaveBeenCalledTimes(2); // download + one rejected upload — no conflict-copy retry
  });

  it('deleteVault() is a no-op success when no file exists', async () => {
    await setDropboxConfig(validConfig);
    global.fetch = vi.fn().mockResolvedValue(notFoundResponse());
    const provider = new DropboxProvider();

    expect(await provider.deleteVault()).toEqual({ success: true });
  });

  it('isConnected() is true when a valid token is available', async () => {
    await setDropboxConfig(validConfig);
    const provider = new DropboxProvider();

    expect(await provider.isConnected()).toBe(true);
  });

  it('isConnected() is false when not connected', async () => {
    const provider = new DropboxProvider();

    expect(await provider.isConnected()).toBe(false);
  });

  it('a 401 response triggers one token refresh and retry', async () => {
    await setDropboxConfig(validConfig);
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'fresh-tok', expires_in: 14400 }))
      .mockResolvedValueOnce(notFoundResponse());
    const provider = new DropboxProvider();

    expect(await provider.getVault()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
    const [, retryInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[2];
    expect((retryInit.headers as Record<string, string>).Authorization).toBe('Bearer fresh-tok');
  });

  it('setDropboxConfig()/getDropboxConfig()/clearDropboxConfig() round-trip through chrome.storage.local, revoking the token on clear', async () => {
    expect(await getDropboxConfig()).toBeNull();

    await setDropboxConfig(validConfig);
    expect(await getDropboxConfig()).toEqual(validConfig);

    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}));
    await clearDropboxConfig();

    expect(await getDropboxConfig()).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      'https://api.dropboxapi.com/2/auth/token/revoke',
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer access-tok' } })
    );
  });
});
