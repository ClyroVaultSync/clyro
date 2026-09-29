import type { FastifyInstance } from 'fastify';
import { createPairingToken } from '../services/pairingTokens';
import { requireAllowedOrigin } from '../plugins/auth';
import { successResponse } from '../utils/response';

export default async function pairingRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAllowedOrigin);

  // POST /api/v1/pairing/initiate
  fastify.post('/initiate', async (_request, reply) => {
    const pairingToken = createPairingToken();
    return reply.status(200).send(successResponse({ pairingToken }));
  });
}
