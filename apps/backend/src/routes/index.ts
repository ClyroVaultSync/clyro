import type { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import deviceRoutes from './devices';
import sessionRoutes from './sessions';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  fastify.register(deviceRoutes, { prefix: '/api/v1/devices' });
  fastify.register(sessionRoutes, { prefix: '/api/v1/sessions' });
}
