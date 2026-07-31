import { apiPost, ApiResponse } from './apiClient';
import { getOrCreateDeviceIdentifier, setAccessToken, setRefreshToken, clearAuthTokens, getAccessToken } from '../storage/localStorage';

export async function register(email: string, password: string, phone?: string): Promise<ApiResponse<{ message: string }>> {
  return apiPost<{ message: string }>('/auth/register', { email, password, phone }, false);
}

export async function login(email: string, password: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>> {
  const deviceIdentifier = await getOrCreateDeviceIdentifier();
  
  const payload = {
    email,
    password,
    device: {
      deviceIdentifier,
      deviceName: 'Chrome Extension',
      platform: 'Chrome',
      browser: 'Chrome Extension',
    },
  };

  const response = await apiPost<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/login', payload, false);
  
  if (response.success && response.data) {
    await setAccessToken(response.data.accessToken);
    await setRefreshToken(response.data.refreshToken);
  }

  return response;
}

export async function logout(): Promise<void> {
  // best-effort — proceed with local cleanup even if this fails, e.g. network offline
  try {
    await apiPost('/auth/logout', undefined, true);
  } catch {
    // Ignore network errors on logout
  }
  
  // Note: clearAuthTokens() clears local tokens, but DOES NOT touch sessionStorage.ts directly,
  // that's the caller's responsibility (background worker will coordinate this).
  await clearAuthTokens();
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}
