import { WebSocketTransport } from '@colyseus/ws-transport';
import { ROOM_TYPE } from '@game/shared';
import { isOriginAllowed, readAllowedOrigins } from './origins.js';
import { PracticeRoom } from './rooms/PracticeRoom.js';
import {
  createEndpoint,
  createRouter,
  defineServer,
  defineRoom,
  matchMaker,
} from '@colyseus/core';

export function createGameServer() {
  const allowed = readAllowedOrigins(
    process.env.ALLOWED_ORIGINS,
    process.env.NODE_ENV === 'production',
  );
  const checkOrigin = (request: Request) => {
    if (!isOriginAllowed(request.headers.get('origin'), allowed)) {
      return new Response('Origin not allowed', { status: 403 });
    }
  };
  matchMaker.controller.getCorsHeaders = (headers) => {
    const origin = headers.get('origin');
    return {
      'Access-Control-Allow-Origin':
        origin && isOriginAllowed(origin, allowed) ? origin : '',
      Vary: 'Origin',
    };
  };
  return defineServer({
    rooms: { [ROOM_TYPE]: defineRoom(PracticeRoom) },
    transport: new WebSocketTransport({
      maxPayload: 4096,
      beforeUpgrade: checkOrigin,
    }),
    greet: false,
    gracefullyShutdown: false,
    routes: createRouter(
      {
        health: createEndpoint('/health', { method: 'GET' }, async () => ({
          status: 'ok',
        })),
      },
      { onRequest: checkOrigin },
    ),
  });
}
