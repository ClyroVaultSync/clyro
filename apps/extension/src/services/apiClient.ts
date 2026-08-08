/**
 * Central API client for all backend communication. Handles auth header injection and automatic token refresh on 401. Per docs/API.md, all responses follow the { success, data } / { success, error } wrapper shape.
 */

import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearAuthTokens } from '../storage/localStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth: boolean = true,
  isRetry: boolean = false
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  if (requiresAuth) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }
  
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);

    if (response.status === 401 && requiresAuth && !isRetry) {
      // Attempt token refresh
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success && refreshData.data?.accessToken) {
            await setAccessToken(refreshData.data.accessToken);
            if (refreshData.data.refreshToken) {
              await setRefreshToken(refreshData.data.refreshToken);
            }
            // Retry the original request ONCE
            return request<T>(path, options, requiresAuth, true);
          }
        }
      }
      
      // If refresh fails or there's no refresh token
      await clearAuthTokens();
      
      // Parse error body if available
      try {
        const errBody = await response.json();
        return errBody as ApiResponse<T>;
      } catch {
         return {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Unauthorized' }
         };
      }
    }
    
    // For non-401 or non-retriable scenarios, parse and return JSON body
    // If it's a 204 No Content, there's no JSON to parse
    if (response.status === 204) {
      return { success: true } as ApiResponse<T>;
    }

    const body = await response.json();
    return body as ApiResponse<T>;
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: error.message || 'Network request failed' }
    };
  }
}

export async function apiGet<T>(path: string, requiresAuth = true): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'GET' }, requiresAuth);
}

export async function apiPost<T>(path: string, body?: unknown, requiresAuth = true): Promise<ApiResponse<T>> {
  return request<T>(path, { 
    method: 'POST', 
    body: body !== undefined ? JSON.stringify(body) : undefined 
  }, requiresAuth);
}

export async function apiPut<T>(path: string, body?: unknown, requiresAuth = true): Promise<ApiResponse<T>> {
  return request<T>(path, { 
    method: 'PUT', 
    body: body !== undefined ? JSON.stringify(body) : undefined 
  }, requiresAuth);
}

export async function apiDelete<T>(path: string, requiresAuth = true): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'DELETE' }, requiresAuth);
}
