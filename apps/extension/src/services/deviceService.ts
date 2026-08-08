import { apiGet, apiDelete, ApiResponse } from './apiClient';

export interface TrustedDevice {
  id: string;
  deviceName: string;
  platform: string;
  browser: string;
  lastSeenAt: string;
  trustedSince: string;
  isActive: boolean;
}

export async function getDevices(): Promise<ApiResponse<{ devices: TrustedDevice[] }>> {
  return apiGet<{ devices: TrustedDevice[] }>('/devices', true);
}

export async function revokeDevice(deviceId: string): Promise<ApiResponse<{ message: string }>> {
  return apiDelete<{ message: string }>(`/devices/${deviceId}`, true);
}
