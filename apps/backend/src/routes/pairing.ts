import type { FastifyInstance } from 'fastify';
import { createPairingToken } from '../services/pairingTokens';
import { successResponse } from '../utils/response';

export default async function pairingRoutes(fastify: FastifyInstance) {
  // POST /api/v1/pairing/initiate
  fastify.post('/initiate', async (_request, reply) => {
    const pairingToken = createPairingToken();
    return reply.status(200).send(successResponse({ pairingToken }));
  });
}
