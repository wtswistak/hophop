import { WebSocketTransport } from '@colyseus/ws-transport';
import { ROOM_TYPE } from '@game/shared';
import { PracticeRoom } from './rooms/PracticeRoom.js';
import {
  createEndpoint,
  createRouter,
  defineServer,
  defineRoom,
} from '@colyseus/core';

export function createGameServer() {
  return defineServer({
    rooms: { [ROOM_TYPE]: defineRoom(PracticeRoom) },
    transport: new WebSocketTransport({ maxPayload: 4096 }),
    greet: false,
    gracefullyShutdown: false,
    routes: createRouter({
      health: createEndpoint('/health', { method: 'GET' }, async () => ({
        status: 'ok',
      })),
    }),
  });
}
