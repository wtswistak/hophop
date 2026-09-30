import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createGameServer } from './server.js';
vi.stubEnv('ALLOWED_ORIGINS', 'https://game.test');
const server = createGameServer();
let url: string;
beforeAll(async () => {
  await server.listen(0, '127.0.0.1');
  const address = server.transport.server!.address() as AddressInfo;
  url = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
  vi.unstubAllEnvs();
});
test('health endpoint reports a running server', async () => {
  const response = await fetch(`${url}/health`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('a real room accepts two clients, rejects the third and publishes server movement', async () => {
  const { ColyseusSDK } = await import('@colyseus/sdk');
  const { LEVEL_ID, ROOM_TYPE } = await import('@game/shared');
  const first = await new ColyseusSDK(url).create(ROOM_TYPE, {
    nickname: 'Alice',
  });
  first.reconnection.enabled = false;
  let second: typeof first | undefined;
  try {
    expect(await (await fetch(`${url}/lobbies`)).json()).toContainEqual({
      roomId: first.roomId,
      players: 1,
    });
    second = await new ColyseusSDK(url).joinById(first.roomId, {
      nickname: 'Bob',
    });
    second.reconnection.enabled = false;
    await expect(
      new ColyseusSDK(url).joinById(first.roomId, { nickname: 'Cara' }),
    ).rejects.toThrow();
    const waitForPhase = (phase: string) =>
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          unbind();
          reject(new Error(`Missing ${phase} phase`));
        }, 5000);
        const unbind = first.onMessage(
          'lobby',
          (lobby: import('@game/shared').LobbySnapshot) => {
            if (lobby.phase === phase) {
              clearTimeout(timeout);
              unbind();
              resolve();
            }
          },
        );
      });
    first.send('input', {
      sequence: 1,
      levelId: LEVEL_ID,
      direction: 1,
      jump: false,
    });
    const loading = waitForPhase('loading');
    first.send('ready', { ready: true });
    second.send('ready', { ready: true });
    await loading;
    const playing = waitForPhase('playing');
    first.send('loaded', {});
    second.send('loaded', {});
    await playing;
    const nextState = new Promise<import('@game/shared').GameSnapshot>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          unbind();
          reject(new Error('Missing movement snapshot'));
        }, 2000);
        const unbind = first.onMessage(
          'snapshot',
          (snapshot: import('@game/shared').GameSnapshot) => {
            const player = snapshot.players.find(
              (item) => item.sessionId === first.sessionId,
            );
            if (player?.lastProcessedSequence === 2) {
              clearTimeout(timeout);
              unbind();
              resolve(snapshot);
            }
          },
        );
      },
    );
    first.send('input', {
      sequence: 2,
      levelId: LEVEL_ID,
      direction: 1,
      jump: false,
    });
    const snapshot = await nextState;
    expect(snapshot.players).toHaveLength(2);
    expect(
      snapshot.players.find((item) => item.sessionId === first.sessionId)!.state
        .x,
    ).toBeGreaterThan(96);
    expect(
      snapshot.players.find((item) => item.sessionId === second!.sessionId)!
        .state.x,
    ).toBe(160);
  } finally {
    await Promise.all([first.leave(), second?.leave()]);
  }
}, 10000);

test('HTTP and preflight only allow the configured browser origin', async () => {
  const allowed = await fetch(`${url}/health`, {
    headers: { Origin: 'https://game.test' },
  });
  expect(allowed.status).toBe(200);
  expect(allowed.headers.get('access-control-allow-origin')).toBe(
    'https://game.test',
  );
  const denied = await fetch(`${url}/matchmake/create/practice`, {
    method: 'POST',
    headers: {
      Origin: 'https://evil.test',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  expect(denied.status).toBe(403);
  expect(denied.headers.get('access-control-allow-origin')).not.toBe(
    'https://evil.test',
  );
  for (const origin of ['https://game.test', 'https://evil.test']) {
    const response = await fetch(`${url}/matchmake/create/practice`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
    });
    expect(response.headers.get('access-control-allow-origin')).toBe(
      origin === 'https://game.test' ? origin : '',
    );
  }
});

test('WebSocket upgrade rejects a disallowed browser origin', async () => {
  const status = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(url, {
      headers: {
        Origin: 'https://evil.test',
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      },
    });
    req.on('response', (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    req.on('upgrade', (_response, socket) => {
      socket.destroy();
      reject(new Error('Unexpected upgrade'));
    });
    req.on('error', reject);
    req.setTimeout(2000, () => req.destroy(new Error('Upgrade timeout')));
    req.end();
  });
  expect(status).toBe(403);
});
