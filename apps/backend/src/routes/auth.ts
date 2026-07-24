import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '../services/authValidation';
import { hashPassword, verifyPassword } from '../services/authPassword';
import {
  generateToken,
  hashToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../services/tokenUtils';
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

  fastify.post('/refresh', async (request, reply) => {
    try {
      const parsed = refreshSchema.parse(request.body);
      const incomingHash = hashRefreshToken(parsed.refreshToken);

      const session = await prisma.session.findFirst({
        where: { refreshTokenHash: incomingHash },
      });

      if (!session) {
        return reply.status(401).send(errorResponse('INVALID_REFRESH_TOKEN', 'Invalid refresh token.'));
      }

      if (!session.isActive || session.revokedAt) {
        return reply.status(401).send(errorResponse('SESSION_REVOKED', 'This session has been revoked.'));
      }

      if (session.expiresAt < new Date()) {
        return reply.status(401).send(errorResponse('REFRESH_TOKEN_EXPIRED', 'Refresh token has expired.'));
      }

      // Rotate: issue new refresh token, invalidate old one
      const newRawRefreshToken = generateRefreshToken();
      const newRefreshTokenHash = hashRefreshToken(newRawRefreshToken);
      const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

      await prisma.session.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
          lastActivityAt: new Date(),
        },
      });

      const ACCESS_TOKEN_TTL_SECONDS = 900;
      const accessToken = fastify.jwt.sign(
        { userId: session.userId, sessionId: session.id },
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
      );

      return reply.status(200).send(
        successResponse({
          accessToken,
          refreshToken: newRawRefreshToken,
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        })
      );
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message || 'Validation error';
        return reply.status(422).send(errorResponse('VALIDATION_ERROR', message));
      }
      console.error('Unexpected error during token refresh:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  fastify.post('/logout', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { sessionId } = request.user as { userId: string; sessionId: string };

      await prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false, revokedAt: new Date() },
      });

      return reply.status(200).send(successResponse({ message: 'Logged out successfully.' }));
    } catch (error) {
      console.error('Unexpected error during logout:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  fastify.post('/logout-all', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { userId } = request.user as { userId: string; sessionId: string };

      await prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });

      return reply.status(200).send(successResponse({ message: 'Logged out of all devices.' }));
    } catch (error) {
      console.error('Unexpected error during logout-all:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  fastify.post('/verify-email', async (request, reply) => {
    try {
      const parsed = verifyEmailSchema.parse(request.body);
      const tokenHash = hashToken(parsed.token);

      const record = await prisma.verificationToken.findFirst({
        where: { tokenHash, tokenType: 'EMAIL' },
      });

      if (!record) {
        return reply.status(401).send(errorResponse('INVALID_TOKEN', 'Invalid verification token.'));
      }
      if (record.usedAt) {
        return reply.status(401).send(errorResponse('TOKEN_ALREADY_USED', 'This token has already been used.'));
      }
      if (record.expiresAt < new Date()) {
        return reply.status(401).send(errorResponse('TOKEN_EXPIRED', 'This token has expired.'));
      }

      await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
        prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      ]);

      return reply.status(200).send(successResponse({ message: 'Email verified successfully.' }));
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(422).send(errorResponse('VALIDATION_ERROR', error.issues[0]?.message || 'Validation error'));
      }
      console.error('Unexpected error during email verification:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  fastify.post('/request-password-reset', async (request, reply) => {
    try {
      const parsed = requestPasswordResetSchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { email: parsed.email } });

      // Always respond with the same generic success message, whether or not the user exists,
      // to prevent user enumeration (per docs/API.md).
      if (user) {
        const rawToken = generateToken();
        const tokenHash = hashToken(rawToken);
        const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        });

        // STUBBED EMAIL DELIVERY — no email provider configured yet.
        // In production this token would be emailed as a reset link, never logged.
        console.log(`[STUB EMAIL] Password reset token for ${user.email}: ${rawToken}`);
      }

      return reply.status(200).send(
        successResponse({ message: 'If an account exists with this email, a password reset link has been sent.' })
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(422).send(errorResponse('VALIDATION_ERROR', error.issues[0]?.message || 'Validation error'));
      }
      console.error('Unexpected error during password reset request:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  fastify.post('/reset-password', async (request, reply) => {
    try {
      const parsed = resetPasswordSchema.parse(request.body);
      const tokenHash = hashToken(parsed.token);

      const record = await prisma.passwordResetToken.findFirst({ where: { tokenHash } });

      if (!record) {
        return reply.status(401).send(errorResponse('INVALID_TOKEN', 'Invalid reset token.'));
      }
      if (record.usedAt) {
        return reply.status(401).send(errorResponse('TOKEN_ALREADY_USED', 'This token has already been used.'));
      }
      if (record.expiresAt < new Date()) {
        return reply.status(401).send(errorResponse('TOKEN_EXPIRED', 'This token has expired.'));
      }

      const newPasswordHash = await hashPassword(parsed.newPassword);

      await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { passwordHash: newPasswordHash } }),
        prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
        prisma.session.updateMany({ where: { userId: record.userId, isActive: true }, data: { isActive: false, revokedAt: new Date() } }),
      ]);

      return reply.status(200).send(successResponse({ message: 'Password reset successfully. Please log in again.' }));
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(422).send(errorResponse('VALIDATION_ERROR', error.issues[0]?.message || 'Validation error'));
      }
      console.error('Unexpected error during password reset:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });
}
