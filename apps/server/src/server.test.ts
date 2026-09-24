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
