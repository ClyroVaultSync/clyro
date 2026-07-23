import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { registerSchema, loginSchema } from '../services/authValidation';
import { hashPassword, verifyPassword } from '../services/authPassword';
import { generateRefreshToken, hashRefreshToken } from '../services/refreshToken';
import { prisma } from '../db';
import { successResponse, errorResponse } from '../utils/response';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    try {
      const parsedBody = registerSchema.parse(request.body);
      const passwordHash = await hashPassword(parsedBody.password);
      
      await prisma.user.create({
        data: {
          email: parsedBody.email,
          phone: parsedBody.phone,
          passwordHash,
        }
      });
      
      return reply.status(201).send(successResponse({ message: 'Account created successfully.' }));
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message || 'Validation error';
        return reply.status(422).send(errorResponse('VALIDATION_ERROR', message));
      }
      
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as unknown) || [];
        const isPhone = Array.isArray(target) ? target.includes('phone') : String(target).includes('phone');
        
        if (isPhone) {
           return reply.status(409).send(errorResponse('PHONE_ALREADY_EXISTS', 'An account with this phone number already exists.'));
        }
        return reply.status(409).send(errorResponse('EMAIL_ALREADY_EXISTS', 'An account with this email already exists.'));
      }

      console.error('Unexpected error during registration:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  fastify.post('/login', async (request, reply) => {
    try {
      const parsed = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({ where: { email: parsed.email } });
      if (!user) {
        return reply.status(401).send(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password.'));
      }

      const passwordValid = await verifyPassword(parsed.password, user.passwordHash);
      if (!passwordValid) {
        return reply.status(401).send(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password.'));
      }

      // Find or create the trusted device
      let device = await prisma.trustedDevice.findFirst({
        where: { userId: user.id, deviceIdentifier: parsed.device.deviceIdentifier },
      });

      if (!device) {
        device = await prisma.trustedDevice.create({
          data: {
            userId: user.id,
            deviceName: parsed.device.deviceName,
            deviceIdentifier: parsed.device.deviceIdentifier,
            platform: parsed.device.platform,
            browser: parsed.device.browser,
            lastSeenAt: new Date(),
          },
        });
      } else {
        device = await prisma.trustedDevice.update({
          where: { id: device.id },
          data: { lastSeenAt: new Date() },
        });
      }

      // Create the session with a hashed refresh token
      const rawRefreshToken = generateRefreshToken();
      const refreshTokenHash = hashRefreshToken(rawRefreshToken);
      const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          deviceId: device.id,
          refreshTokenHash,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
          lastActivityAt: new Date(),
          isActive: true,
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const ACCESS_TOKEN_TTL_SECONDS = 900; // 15 minutes, per docs/API.md
      const accessToken = fastify.jwt.sign(
        { userId: user.id, sessionId: session.id },
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
      );

      return reply.status(200).send(
        successResponse({
          accessToken,
          refreshToken: rawRefreshToken,
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        })
      );
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message || 'Validation error';
        return reply.status(422).send(errorResponse('VALIDATION_ERROR', message));
      }
      console.error('Unexpected error during login:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });
}
