import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { successResponse, errorResponse } from '../utils/response';

export default async function deviceRoutes(fastify: FastifyInstance) {
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string; sessionId: string };

    const devices = await prisma.trustedDevice.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        platform: true,
        browser: true,
        lastSeenAt: true,
        trustedSince: true,
        isActive: true,
      },
    });

    return reply.status(200).send(successResponse({ devices }));
  });

  fastify.get('/:deviceId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string; sessionId: string };
    const { deviceId } = request.params as { deviceId: string };

    const device = await prisma.trustedDevice.findFirst({
      where: { id: deviceId, userId },
      select: {
        id: true,
        deviceName: true,
        platform: true,
        browser: true,
        lastSeenAt: true,
        trustedSince: true,
        isActive: true,
      },
    });

    if (!device) {
      return reply.status(404).send(errorResponse('NOT_FOUND', 'Device not found.'));
    }

    return reply.status(200).send(successResponse(device));
  });

  fastify.delete('/:deviceId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string; sessionId: string };
    const { deviceId } = request.params as { deviceId: string };

    const device = await prisma.trustedDevice.findFirst({ where: { id: deviceId, userId } });
    if (!device) {
      return reply.status(404).send(errorResponse('NOT_FOUND', 'Device not found.'));
    }

    await prisma.$transaction([
      prisma.session.updateMany({
        where: { deviceId: device.id, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      }),
      prisma.trustedDevice.update({
        where: { id: device.id },
        data: { isActive: false },
      }),
    ]);

    return reply.status(200).send(successResponse({ message: 'Device revoked successfully.' }));
  });
}
