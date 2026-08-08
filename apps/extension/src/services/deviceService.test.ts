import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { getDevices, revokeDevice } from './deviceService';
import { apiGet, apiDelete } from './apiClient';

vi.mock('./apiClient', () => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('deviceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDevices() fetches the device list', async () => {
    (apiGet as Mock).mockResolvedValue({ success: true, data: { devices: [{ id: 'd1' }] } });

    const res = await getDevices();

    expect(apiGet).toHaveBeenCalledWith('/devices', true);
    expect(res.success).toBe(true);
    expect(res.data?.devices).toEqual([{ id: 'd1' }]);
  });

  it('revokeDevice() calls DELETE on the correct path', async () => {
    (apiDelete as Mock).mockResolvedValue({ success: true, data: { message: 'Device revoked successfully.' } });

    const res = await revokeDevice('d1');

    expect(apiDelete).toHaveBeenCalledWith('/devices/d1', true);
    expect(res.success).toBe(true);
  });
});
