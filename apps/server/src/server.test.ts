import { afterAll, beforeAll, expect, test } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createGameServer } from './server.js';
const server = createGameServer();
let url: string;
beforeAll(async () => {
  await server.listen(0, '127.0.0.1');
  const address = server.transport.server!.address() as AddressInfo;
  url = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});
test('health endpoint reports a running server', async () => {
  const response = await fetch(`${url}/health`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('a real room accepts two clients, rejects the third and publishes server movement', async () => {
  const { ColyseusSDK } = await import('@colyseus/sdk');
  const { LEVEL_ID, ROOM_TYPE } = await import('@game/shared');
  const first = await new ColyseusSDK(url).create(ROOM_TYPE);
  first.reconnection.enabled = false;
  let second: typeof first | undefined;
  try {
    second = await new ColyseusSDK(url).joinById(first.roomId);
    second.reconnection.enabled = false;
    await expect(new ColyseusSDK(url).joinById(first.roomId)).rejects.toThrow();
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
            if (player?.lastProcessedSequence === 1) {
              clearTimeout(timeout);
              unbind();
              resolve(snapshot);
            }
          },
        );
      },
    );
    first.send('input', {
      sequence: 1,
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
});
