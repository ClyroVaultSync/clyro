import fastify from 'fastify';
import jwt from '@fastify/jwt';
import routes from './routes';
import authenticatePlugin from './plugins/authenticate';

const server = fastify();

server.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-fallback' });
server.register(authenticatePlugin);
server.register(routes);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

server.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
