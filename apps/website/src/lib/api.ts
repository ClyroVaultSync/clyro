/**
 * Clyro API Client
 * Interfacing with all 18 backend endpoints per docs/API.md
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface DevicePayload {
  deviceIdentifier: string;
  deviceName: string;
  platform: string;
  browser: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface TrustedDevice {
  id: string;
  deviceName: string;
  platform: string;
  browser: string;
  lastSeenAt: string;
  trustedSince: string;
  isActive: boolean;
}

export interface ActiveSession {
  id: string;
  deviceId: string;
  deviceName: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

export interface VaultMetadata {
  vaultVersion: number;
  lastModified: string;
}

export interface VaultData extends VaultMetadata {
  id: string;
  userId: string;
  encryptedVault: string;
  createdAt: string;
  updatedAt: string;
}

// Helpers for localStorage token management & device identification
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('clyro_access_token');
}

export function setAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('clyro_access_token', token);
  } else {
    localStorage.removeItem('clyro_access_token');
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('clyro_refresh_token');
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('clyro_refresh_token', token);
  } else {
    localStorage.removeItem('clyro_refresh_token');
  }
}

export function getDeviceIdentifier(): string {
  if (typeof window === 'undefined') return 'server-stub';
  let deviceId = localStorage.getItem('clyro_device_id');
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'dev-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('clyro_device_id', deviceId);
  }
  return deviceId;
}

export function getDeviceDetails(): DevicePayload {
  const deviceIdentifier = getDeviceIdentifier();
  let platform = 'Web';
  let browser = 'Browser';

  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Win')) platform = 'Windows';
    else if (userAgent.includes('Mac')) platform = 'macOS';
    else if (userAgent.includes('Linux')) platform = 'Linux';
    else if (userAgent.includes('Android')) platform = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';
  }

  return {
    deviceIdentifier,
    deviceName: `Clyro Web on ${platform}`,
    platform,
    browser
  };
}

async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  const token = getAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await res.json();
    return data;
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error occurred. Please try again.'
      }
    };
  }
}

export const api = {
  // Auth API
  auth: {
    register: (payload: { email: string; password: string; phone?: string }) =>
      request<{ message: string }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),

    login: async (payload: { email: string; password: string }) => {
      const device = getDeviceDetails();
      const res = await request<{ accessToken: string; refreshToken: string; expiresIn: number }>(
        '/api/v1/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ ...payload, device })
        }
      );
      if (res.success && res.data) {
        setAccessToken(res.data.accessToken);
        setRefreshToken(res.data.refreshToken);
      }
      return res;
    },

    refresh: async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return { success: false, error: { code: 'NO_TOKEN', message: 'No refresh token available.' } };

      const res = await request<{ accessToken: string; refreshToken: string; expiresIn: number }>(
        '/api/v1/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        }
      );

      if (res.success && res.data) {
        setAccessToken(res.data.accessToken);
        setRefreshToken(res.data.refreshToken);
      } else {
        setAccessToken(null);
        setRefreshToken(null);
      }
      return res;
    },

    logout: async () => {
      const res = await request<{ message: string }>('/api/v1/auth/logout', { method: 'POST' });
      setAccessToken(null);
      setRefreshToken(null);
      return res;
    },

    logoutAll: async () => {
      const res = await request<{ message: string }>('/api/v1/auth/logout-all', { method: 'POST' });
      setAccessToken(null);
      setRefreshToken(null);
      return res;
    },

    verifyEmail: (token: string) =>
      request<{ message: string }>('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token })
      }),

    requestPasswordReset: (email: string) =>
      request<{ message: string }>('/api/v1/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),

    resetPassword: (payload: { token: string; newPassword: string }) =>
      request<{ message: string }>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  },

  // Devices API
  devices: {
    list: () => request<{ devices: TrustedDevice[] }>('/api/v1/devices', { method: 'GET' }),
    get: (deviceId: string) => request<TrustedDevice>(`/api/v1/devices/${deviceId}`, { method: 'GET' }),
    revoke: (deviceId: string) => request<{ message: string }>(`/api/v1/devices/${deviceId}`, { method: 'DELETE' })
  },

  // Sessions API
  sessions: {
    list: () => request<{ sessions: ActiveSession[] }>('/api/v1/sessions', { method: 'GET' }),
    revoke: (sessionId: string) => request<{ message: string }>(`/api/v1/sessions/${sessionId}`, { method: 'DELETE' })
  },

  // Vault API
  vault: {
    get: () => request<VaultData>('/api/v1/vault', { method: 'GET' }),
    getMetadata: () => request<VaultMetadata>('/api/v1/vault/metadata', { method: 'GET' }),
    create: (payload: { encryptedVault: string; vaultVersion: number }) =>
      request<VaultData>('/api/v1/vault', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    update: (payload: { encryptedVault: string; vaultVersion: number }) =>
      request<VaultData>('/api/v1/vault', {
        method: 'PUT',
        body: JSON.stringify(payload)
      }),
    delete: () => request<{ message: string }>('/api/v1/vault', { method: 'DELETE' })
  }
};
