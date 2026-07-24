import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';
import jwt from '@fastify/jwt';
import deviceRoutes from './devices';
import { prisma } from '../db';
import authenticatePlugin from '../plugins/authenticate';

vi.mock('../db', () => ({
  prisma: {
    trustedDevice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    session: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (args) => {
      return Promise.all(args);
    }),
  },
}));

describe('Device Routes', () => {
  let app: ReturnType<typeof fastify>;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = fastify();
    app.register(jwt, { secret: 'test-secret' });
    app.register(authenticatePlugin);
    app.register(deviceRoutes, { prefix: '/api/v1/devices' });
    await app.ready();
    token = app.jwt.sign({ userId: 'user-1', sessionId: 'session-1' });
  });

  describe('GET /', () => {
    it('should return devices successfully', async () => {
      const mockDevices = [{ id: 'device-1', deviceName: 'Chrome' }];
      vi.mocked(prisma.trustedDevice.findMany).mockResolvedValue(mockDevices as never);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/devices',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.devices).toEqual(mockDevices);
      expect(prisma.trustedDevice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: expect.any(Object),
      });
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/devices',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /:deviceId', () => {
    it('should return a device successfully', async () => {
      const mockDevice = { id: 'device-1', deviceName: 'Chrome' };
      vi.mocked(prisma.trustedDevice.findFirst).mockResolvedValue(mockDevice as never);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/devices/device-1',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data).toEqual(mockDevice);
      expect(prisma.trustedDevice.findFirst).toHaveBeenCalledWith({
        where: { id: 'device-1', userId: 'user-1' },
        select: expect.any(Object),
      });
    });

    it('should return 404 if device not found or belongs to different user', async () => {
      vi.mocked(prisma.trustedDevice.findFirst).mockResolvedValue(null as never);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/devices/device-1',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/devices/device-1',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /:deviceId', () => {
    it('should revoke device successfully', async () => {
      vi.mocked(prisma.trustedDevice.findFirst).mockResolvedValue({ id: 'device-1', userId: 'user-1' } as never);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/devices/device-1',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { deviceId: 'device-1', isActive: true },
        data: { isActive: false, revokedAt: expect.any(Date) },
      });
      expect(prisma.trustedDevice.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { isActive: false },
      });
    });

    it('should return 404 if device not found', async () => {
      vi.mocked(prisma.trustedDevice.findFirst).mockResolvedValue(null as never);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/devices/device-1',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/devices/device-1',
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
