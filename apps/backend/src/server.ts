import fastify from 'fastify';
import routes from './routes';

const server = fastify();

server.register(routes);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 47821;

server.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  // The Windows tray app (packaging/windows/ClyroSync.cs) watches for this line to show "Running".
  console.log(`Server listening at ${address}`);
});
