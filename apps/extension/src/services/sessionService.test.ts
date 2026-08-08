import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { getSessions, revokeSession, logoutAll } from './sessionService';
import { apiGet, apiDelete, apiPost } from './apiClient';

vi.mock('./apiClient', () => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
  apiPost: vi.fn(),
}));

describe('sessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSessions() fetches the session list', async () => {
    (apiGet as Mock).mockResolvedValue({ success: true, data: { sessions: [{ id: 's1' }] } });

    const res = await getSessions();

    expect(apiGet).toHaveBeenCalledWith('/sessions', true);
    expect(res.success).toBe(true);
    expect(res.data?.sessions).toEqual([{ id: 's1' }]);
  });

  it('revokeSession() calls DELETE on the correct path', async () => {
    (apiDelete as Mock).mockResolvedValue({ success: true, data: { message: 'Session revoked successfully.' } });

    const res = await revokeSession('s1');

    expect(apiDelete).toHaveBeenCalledWith('/sessions/s1', true);
    expect(res.success).toBe(true);
  });

  it('logoutAll() posts to /auth/logout-all', async () => {
    (apiPost as Mock).mockResolvedValue({ success: true });

    const res = await logoutAll();

    expect(apiPost).toHaveBeenCalledWith('/auth/logout-all', undefined, true);
    expect(res.success).toBe(true);
  });
});
