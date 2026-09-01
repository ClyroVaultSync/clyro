import type { FastifyInstance } from 'fastify';
import vaultRoutes from './vault';
import pairingRoutes from './pairing';
import { requirePairing } from '../plugins/auth';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(pairingRoutes, { prefix: '/api/v1/pairing' });

  fastify.register(async (instance) => {
    instance.addHook('preHandler', requirePairing);
    instance.register(vaultRoutes, { prefix: '/api/v1/vault' });
  });
}
