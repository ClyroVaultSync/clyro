import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';
import authRoutes from './auth';
import { prisma } from '../db';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Mock the Prisma client
vi.mock('../db', () => ({
  prisma: {
    user: {
      create: vi.fn(),
    },
  },
}));

describe('Auth Routes', () => {
  let app: ReturnType<typeof fastify>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = fastify();
    app.register(authRoutes, { prefix: '/api/v1/auth' });
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
});
