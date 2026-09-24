import { createEndpoint, createRouter, defineServer } from '@colyseus/core';

export function createGameServer() {
  return defineServer({
    rooms: {},
    greet: false,
    gracefullyShutdown: false,
    routes: createRouter({
      health: createEndpoint('/health', { method: 'GET' }, async () => ({
        status: 'ok',
      })),
    }),
  });
}
