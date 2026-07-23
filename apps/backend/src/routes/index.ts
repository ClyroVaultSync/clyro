import type { FastifyInstance } from 'fastify';
import authRoutes from './auth';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/api/v1/auth' });
}
