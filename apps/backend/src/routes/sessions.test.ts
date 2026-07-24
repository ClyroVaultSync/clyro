import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';
import jwt from '@fastify/jwt';
import sessionRoutes from './sessions';
import { prisma } from '../db';
import authenticatePlugin from '../plugins/authenticate';

vi.mock('../db', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Session Routes', () => {
  let app: ReturnType<typeof fastify>;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = fastify();
    app.register(jwt, { secret: 'test-secret' });
    app.register(authenticatePlugin);
    app.register(sessionRoutes, { prefix: '/api/v1/sessions' });
    await app.ready();
    token = app.jwt.sign({ userId: 'user-1', sessionId: 'session-1' });
  });

  describe('GET /', () => {
    it('should return formatted sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          deviceId: 'device-1',
          createdAt: new Date(),
          lastActivityAt: new Date(),
          expiresAt: new Date(),
          device: { deviceName: 'Chrome' },
        },
      ];
      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions as never);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.sessions[0].deviceName).toBe('Chrome');
      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        select: expect.any(Object),
      });
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /:sessionId', () => {
    it('should revoke session successfully', async () => {
      vi.mocked(prisma.session.findFirst).mockResolvedValue({ id: 'session-1', userId: 'user-1' } as never);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/sessions/session-1',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { isActive: false, revokedAt: expect.any(Date) },
      });
    });

    it('should return 404 if session not found', async () => {
      vi.mocked(prisma.session.findFirst).mockResolvedValue(null as never);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/sessions/session-1',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/sessions/session-1',
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
