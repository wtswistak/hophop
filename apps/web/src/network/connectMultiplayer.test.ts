import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createPlayer, practiceLevel } from '@game/core';
import { LEVEL_ID, ROOM_TYPE } from '@game/shared';
import { connectMultiplayer } from './connectMultiplayer';

const sdk = vi.hoisted(() => ({ create: vi.fn(), joinById: vi.fn() }));
vi.mock('@colyseus/sdk', () => ({
  ColyseusSDK: class {
    create = sdk.create;
    joinById = sdk.joinById;
  },
}));

function signal() {
  const listeners = new Set<() => void>();
  return Object.assign(
    (callback: () => void) => {
      listeners.add(callback);
    },
    {
      remove: (callback: () => void) => {
        listeners.delete(callback);
      },
      emit: () => {
        for (const callback of [...listeners]) callback();
      },
    },
  );
}

function createRoom() {
  let receive: ((message: unknown) => void) | undefined;
  const unbind = vi.fn();
  return {
    roomId: 'room',
    connection: { isOpen: true },
    sessionId: 'a',
    reconnection: { enabled: true },
    onLeave: signal(),
    onError: signal(),
    send: vi.fn(),
    leave: vi.fn(async () => 1000),
    onMessage: (_type: string, callback: (message: unknown) => void) => {
      receive = callback;
      return unbind;
    },
    deliver: () =>
      receive?.({
        tick: 1,
        levelId: LEVEL_ID,
        players: [
          {
            sessionId: 'a',
            state: createPlayer(practiceLevel),
            lastProcessedSequence: 0,
          },
        ],
      }),
    unbind,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', {
    location: { hostname: 'localhost' },
    setTimeout,
    clearTimeout,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test('create waits for the first snapshot and closing releases the room once', async () => {
  const room = createRoom();
  sdk.create.mockResolvedValue(room);
  const connecting = connectMultiplayer();
  await Promise.resolve();
  room.deliver();
  const session = await connecting;
  expect(sdk.create).toHaveBeenCalledWith(ROOM_TYPE);
  expect(room.reconnection.enabled).toBe(false);
  expect(session.getStatus().playerCount).toBe(1);
  session.close();
  session.close();
  expect(room.leave).toHaveBeenCalledTimes(1);
  expect(room.unbind).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

test('joining uses the supplied ID and a transport error marks the session disconnected', async () => {
  const room = createRoom();
  sdk.joinById.mockResolvedValue(room);
  const connecting = connectMultiplayer('room');
  await Promise.resolve();
  room.deliver();
  const session = await connecting;
  expect(sdk.joinById).toHaveBeenCalledWith('room');
  room.onError.emit();
  expect(session.getStatus().connected).toBe(false);
  expect(room.leave).toHaveBeenCalledTimes(1);
});

test('a missing initial snapshot rejects and releases the seat', async () => {
  const room = createRoom();
  sdk.create.mockResolvedValue(room);
  const connecting = connectMultiplayer();
  const rejected = expect(connecting).rejects.toThrow(
    'Serwer nie przesłał stanu gry.',
  );
  await vi.advanceTimersByTimeAsync(5000);
  await rejected;
  expect(room.leave).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

test('leaving before the initial snapshot rejects immediately', async () => {
  const room = createRoom();
  sdk.create.mockResolvedValue(room);
  const connecting = connectMultiplayer();
  const rejected = expect(connecting).rejects.toThrow(
    'Połączenie z sesją zostało zakończone.',
  );
  await Promise.resolve();
  room.onLeave.emit();
  await rejected;
  expect(room.leave).toHaveBeenCalledTimes(1);
});
