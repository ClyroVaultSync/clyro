import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';
import jwt from '@fastify/jwt';
import authRoutes from './auth';
import { prisma } from '../db';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { verifyPassword } from '../services/authPassword';
import authenticatePlugin from '../plugins/authenticate';

// Mock the Prisma client
vi.mock('../db', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    trustedDevice: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../services/authPassword', () => ({
  hashPassword: vi.fn().mockResolvedValue('fakehash'),
  verifyPassword: vi.fn(),
}));

describe('Auth Routes', () => {
  let app: ReturnType<typeof fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = fastify();
    app.register(jwt, { secret: 'test-secret' });
    app.register(authenticatePlugin);
    app.register(authRoutes, { prefix: '/api/v1/auth' });
    await app.ready();
  });

  it('should return 201 on successful registration', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue({ id: '1' } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'Password123!',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      success: true,
      data: { message: 'Account created successfully.' },
    });
  });

  it('should return 409 EMAIL_ALREADY_EXISTS on duplicate email', async () => {
    const prismaError = new PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
      meta: { target: ['email'] },
    });
    vi.mocked(prisma.user.create).mockRejectedValue(prismaError);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'Password123!',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists.',
      },
    });
  });

  it('should return 409 PHONE_ALREADY_EXISTS on duplicate phone number', async () => {
    const prismaError = new PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
      meta: { target: ['phone'] },
    });
    vi.mocked(prisma.user.create).mockRejectedValue(prismaError);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'newuser@example.com',
        phone: '+911234567890',
        password: 'Password123!',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'PHONE_ALREADY_EXISTS',
        message: 'An account with this phone number already exists.',
      },
    });
  });

  it('should return 422 on invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'not-an-email',
        password: 'Password123!',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should return 422 on password under 8 characters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'short',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters',
      },
    });
  });

  describe('Login Route', () => {
    const validLoginPayload = {
      email: 'test@example.com',
      password: 'Password123!',
      device: {
        deviceIdentifier: 'device-123',
        deviceName: 'Chrome',
        platform: 'Windows',
        browser: 'Chrome 126',
      },
    };

    it('should return 200 with tokens on successful login', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', passwordHash: 'hash' } as never);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(prisma.trustedDevice.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.trustedDevice.create).mockResolvedValue({ id: 'dev-1' } as never);
      vi.mocked(prisma.session.create).mockResolvedValue({ id: 'sess-1' } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: validLoginPayload,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('accessToken');
      expect(json.data).toHaveProperty('refreshToken');
      expect(json.data.expiresIn).toBe(900);
    });

    it('should return 401 INVALID_CREDENTIALS on wrong password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', passwordHash: 'hash' } as never);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: validLoginPayload,
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    });

    it('should return 401 INVALID_CREDENTIALS on non-existent email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: validLoginPayload,
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    });

    it('should return 422 VALIDATION_ERROR on missing device object', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
        },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().success).toBe(false);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('should update lastSeenAt on existing trusted device instead of creating a new one', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', passwordHash: 'hash' } as never);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(prisma.trustedDevice.findFirst).mockResolvedValue({ id: 'dev-existing' } as never);
      vi.mocked(prisma.trustedDevice.update).mockResolvedValue({ id: 'dev-existing' } as never);
      vi.mocked(prisma.session.create).mockResolvedValue({ id: 'sess-1' } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: validLoginPayload,
      });

      expect(response.statusCode).toBe(200);
      expect(prisma.trustedDevice.create).not.toHaveBeenCalled();
      expect(prisma.trustedDevice.update).toHaveBeenCalledWith({
        where: { id: 'dev-existing' },
        data: { lastSeenAt: expect.any(Date) },
      });
    });
  });

  describe('Refresh Route', () => {
    it('should return 200 with new tokens on valid refresh token', async () => {
      vi.mocked(prisma.session.findFirst).mockResolvedValue({
        id: 'sess-1',
        userId: 'user-1',
        isActive: true,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      } as never);
      vi.mocked(prisma.session.update).mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: 'old-refresh-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('accessToken');
      expect(json.data).toHaveProperty('refreshToken');
      expect(json.data.refreshToken).not.toBe('old-refresh-token');
      expect(json.data.expiresIn).toBe(900);
    });

    it('should return 401 INVALID_REFRESH_TOKEN on unknown/invalid token', async () => {
      vi.mocked(prisma.session.findFirst).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token.' },
      });
    });

    it('should return 401 SESSION_REVOKED on revoked session (isActive: false)', async () => {
      vi.mocked(prisma.session.findFirst).mockResolvedValue({
        id: 'sess-1',
        isActive: false,
        revokedAt: null,
      } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: 'revoked-token',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        success: false,
        error: { code: 'SESSION_REVOKED', message: 'This session has been revoked.' },
      });
    });

    it('should return 401 REFRESH_TOKEN_EXPIRED on expired session', async () => {
      vi.mocked(prisma.session.findFirst).mockResolvedValue({
        id: 'sess-1',
        isActive: true,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // In the past
      } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: 'expired-token',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        success: false,
        error: { code: 'REFRESH_TOKEN_EXPIRED', message: 'Refresh token has expired.' },
      });
    });

    it('should return 422 VALIDATION_ERROR on missing refreshToken field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {}, // Missing refreshToken
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().success).toBe(false);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Logout Route', () => {
    it('should return 200 on successful logout', async () => {
      const token = app.jwt.sign({ userId: 'user-1', sessionId: 'sess-1' });
      vi.mocked(prisma.session.update).mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        data: { message: 'Logged out successfully.' },
      });
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: { isActive: false, revokedAt: expect.any(Date) },
      });
    });

    it('should return 401 UNAUTHORIZED when missing header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 UNAUTHORIZED on invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Logout-All Route', () => {
    it('should return 200 on successful logout-all', async () => {
      const token = app.jwt.sign({ userId: 'user-1', sessionId: 'sess-1' });
      vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 2 } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout-all',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        data: { message: 'Logged out of all devices.' },
      });
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        data: { isActive: false, revokedAt: expect.any(Date) },
      });
    });

    it('should return 401 UNAUTHORIZED when missing header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout-all',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('UNAUTHORIZED');
    });
  });
});
