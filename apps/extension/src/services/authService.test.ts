import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { login, logout, isAuthenticated } from './authService';
import { apiPost } from './apiClient';
import { getOrCreateDeviceIdentifier, setAccessToken, setRefreshToken, clearAuthTokens, getAccessToken } from '../storage/localStorage';

vi.mock('./apiClient', () => ({
  apiPost: vi.fn(),
}));

vi.mock('../storage/localStorage', () => ({
  getOrCreateDeviceIdentifier: vi.fn(),
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
  clearAuthTokens: vi.fn(),
  getAccessToken: vi.fn(),
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login() stores tokens on success', async () => {
    (getOrCreateDeviceIdentifier as Mock).mockResolvedValue('device-123');
    (apiPost as Mock).mockResolvedValue({
      success: true,
      data: { accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600 },
    });

    const res = await login('test@example.com', 'password123');

    expect(apiPost).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
      email: 'test@example.com',
      password: 'password123',
      device: expect.objectContaining({
        deviceIdentifier: 'device-123',
      }),
    }), false);
    
    expect(res.success).toBe(true);
    expect(setAccessToken).toHaveBeenCalledWith('access');
    expect(setRefreshToken).toHaveBeenCalledWith('refresh');
  });

  it('login() does NOT store tokens on failure', async () => {
    (getOrCreateDeviceIdentifier as Mock).mockResolvedValue('device-123');
    (apiPost as Mock).mockResolvedValue({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Bad password' },
    });

    const res = await login('test@example.com', 'wrong');

    expect(res.success).toBe(false);
    expect(setAccessToken).not.toHaveBeenCalled();
    expect(setRefreshToken).not.toHaveBeenCalled();
  });

  it('logout() clears tokens even if the network call fails', async () => {
    (apiPost as Mock).mockRejectedValue(new Error('Network error'));

    await logout();

    expect(apiPost).toHaveBeenCalledWith('/auth/logout', undefined, true);
    expect(clearAuthTokens).toHaveBeenCalled();
  });

  it('isAuthenticated() reflects token presence correctly', async () => {
    (getAccessToken as Mock).mockResolvedValue('token');
    expect(await isAuthenticated()).toBe(true);

    (getAccessToken as Mock).mockResolvedValue(null);
    expect(await isAuthenticated()).toBe(false);
  });
});
