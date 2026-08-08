// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { apiGet, apiPost } from './apiClient';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearAuthTokens } from '../storage/localStorage';

vi.mock('../storage/localStorage', () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
  clearAuthTokens: vi.fn(),
}));

global.fetch = vi.fn();

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successful request attaches auth header correctly', async () => {
    (getAccessToken as Mock).mockResolvedValue('test-access-token');
    (global.fetch as Mock).mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: { id: 1 } }),
    });

    const res = await apiGet('/test', true);
    expect(res.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = (global.fetch as Mock).mock.calls[0];
    expect(callArgs[0]).toContain('/test');
    expect(callArgs[1].headers.get('Authorization')).toBe('Bearer test-access-token');
  });

  it('requiresAuth=false skips the auth header entirely', async () => {
    (getAccessToken as Mock).mockResolvedValue('test-access-token');
    (global.fetch as Mock).mockResolvedValue({
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiPost('/test-no-auth', undefined, false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = (global.fetch as Mock).mock.calls[0];
    expect(callArgs[1].headers.has('Authorization')).toBe(false);
  });

  it('401 triggers one refresh attempt + retry on success', async () => {
    (getAccessToken as Mock).mockResolvedValue('old-access-token');
    (getRefreshToken as Mock).mockResolvedValue('old-refresh-token');

    // First fetch fails with 401
    // Second fetch is the refresh which succeeds
    // Third fetch is the retry which succeeds
    (global.fetch as Mock)
      .mockResolvedValueOnce({
        status: 401,
        json: async () => ({ success: false }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ success: true, data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' } }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true, data: { retried: true } }),
      });

    const res = await apiGet('/protected-route', true);

    expect(global.fetch).toHaveBeenCalledTimes(3);
    
    // Check refresh endpoint was called
    const refreshCallArgs = (global.fetch as Mock).mock.calls[1];
    expect(refreshCallArgs[0]).toContain('/auth/refresh');
    expect(JSON.parse(refreshCallArgs[1].body).refreshToken).toBe('old-refresh-token');

    // Check setAccessToken and setRefreshToken were called
    expect(setAccessToken).toHaveBeenCalledWith('new-access-token');
    expect(setRefreshToken).toHaveBeenCalledWith('new-refresh-token');

    expect(res.success).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((res.data as any).retried).toBe(true);
  });

  it('refresh failure clears tokens and doesn\'t loop infinitely', async () => {
    (getAccessToken as Mock).mockResolvedValue('old-access-token');
    (getRefreshToken as Mock).mockResolvedValue('old-refresh-token');

    // First fetch fails with 401
    // Second fetch is the refresh which ALSO fails with 401
    (global.fetch as Mock)
      .mockResolvedValueOnce({
        status: 401,
        json: async () => ({ success: false, error: { code: 'UNAUTHORIZED', message: 'Original request failed' } }),
      })
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ success: false }),
      });

    const res = await apiGet('/protected-route', true);

    // Should only be called 2 times (original + 1 refresh attempt)
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
  });
});
