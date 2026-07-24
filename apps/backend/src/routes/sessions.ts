import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { successResponse, errorResponse } from '../utils/response';

export default async function sessionRoutes(fastify: FastifyInstance) {
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string; sessionId: string };

    const sessions = await prisma.session.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        deviceId: true,
        createdAt: true,
        lastActivityAt: true,
        expiresAt: true,
        device: { select: { deviceName: true } },
      },
    });

    const formatted = sessions.map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      deviceName: s.device.deviceName,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
    }));

    return reply.status(200).send(successResponse({ sessions: formatted }));
  });

  fastify.delete('/:sessionId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string; sessionId: string };
    const { sessionId } = request.params as { sessionId: string };

    const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) {
      return reply.status(404).send(errorResponse('NOT_FOUND', 'Session not found.'));
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { isActive: false, revokedAt: new Date() },
    });

    return reply.status(200).send(successResponse({ message: 'Session revoked successfully.' }));
  });
}
