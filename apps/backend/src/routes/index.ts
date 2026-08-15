import type { FastifyInstance } from 'fastify';
import vaultRoutes from './vault';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(vaultRoutes, { prefix: '/api/v1/vault' });
}
