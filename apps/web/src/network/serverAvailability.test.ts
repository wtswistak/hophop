import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { resolveServerEndpoint, waitForServer } from './serverAvailability';
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

test('production requires HTTPS while development can use a LAN hostname', () => {
  expect(resolveServerEndpoint(undefined, false, '192.168.1.5')).toBe(
    'http://192.168.1.5:2567',
  );
  expect(resolveServerEndpoint('https://server.test/', true, '')).toBe(
    'https://server.test',
  );
  for (const value of [
    undefined,
    'http://server.test',
    'wss://server.test',
    'https://server.test/path',
    'https://user:secret@server.test',
  ]) {
    expect(() => resolveServerEndpoint(value, true, '')).toThrow();
  }
});

test('retries only health checks until the server returns valid JSON', async () => {
  fetchMock
    .mockResolvedValueOnce(new Response('Starting', { status: 503 }))
    .mockResolvedValueOnce(new Response('<html>Starting</html>'))
    .mockResolvedValueOnce(Response.json({ status: 'ok' }));
  const pending = waitForServer(
    'https://server.test',
    new AbortController().signal,
  );
  await vi.advanceTimersByTimeAsync(4000);
  await pending;
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(
    fetchMock.mock.calls.every(([url]) => url === 'https://server.test/health'),
  ).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

test('stops retrying after 90 seconds', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  const rejected = expect(
    waitForServer('https://server.test', new AbortController().signal),
  ).rejects.toThrow('Serwer jest niedostępny');
  await vi.advanceTimersByTimeAsync(90000);
  await rejected;
  const calls = fetchMock.mock.calls.length;
  await vi.advanceTimersByTimeAsync(10000);
  expect(fetchMock).toHaveBeenCalledTimes(calls);
  expect(vi.getTimerCount()).toBe(0);
});

test('cancelling interrupts a pending request and clears its timer', async () => {
  fetchMock.mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init!.signal!.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
  const controller = new AbortController();
  const rejected = expect(
    waitForServer('https://server.test', controller.signal),
  ).rejects.toThrow();
  controller.abort();
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});

test('cancelling during retry delay prevents another request', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  const controller = new AbortController();
  const rejected = expect(
    waitForServer('https://server.test', controller.signal),
  ).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(1);
  controller.abort();
  await rejected;
  await vi.advanceTimersByTimeAsync(10000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

test('a stalled health request times out before the next attempt succeeds', async () => {
  fetchMock
    .mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    )
    .mockResolvedValueOnce(Response.json({ status: 'ok' }));
  const pending = waitForServer(
    'https://server.test',
    new AbortController().signal,
  );
  await vi.advanceTimersByTimeAsync(12000);
  await pending;
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});
