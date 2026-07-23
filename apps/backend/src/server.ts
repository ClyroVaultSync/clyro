import fastify from 'fastify';
import routes from './routes';

const server = fastify();

server.register(routes);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

server.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
