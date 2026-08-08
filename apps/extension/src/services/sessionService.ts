import { apiGet, apiDelete, apiPost, ApiResponse } from './apiClient';

export interface UserSession {
  id: string;
  deviceId: string;
  deviceName: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

export async function getSessions(): Promise<ApiResponse<{ sessions: UserSession[] }>> {
  return apiGet<{ sessions: UserSession[] }>('/sessions', true);
}

export async function revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
  return apiDelete<{ message: string }>(`/sessions/${sessionId}`, true);
}

export async function logoutAll(): Promise<ApiResponse<unknown>> {
  return apiPost('/auth/logout-all', undefined, true);
}
