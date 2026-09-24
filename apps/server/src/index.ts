import { createGameServer } from './server.js';
const port = Number(process.env.PORT ?? 2567);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be an integer between 1 and 65535');
const server = createGameServer();
await server.listen(port, '0.0.0.0');
let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  void server.gracefullyShutdown(false).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
