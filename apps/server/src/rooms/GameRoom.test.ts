import { expect, test, vi } from 'vitest';
import type { Client } from '@colyseus/core';
import type { GameSnapshot, LobbySnapshot } from '@game/shared';
import { GameRoom } from './GameRoom.js';

// Replace transport/timers only; exercise the real room, lobby and simulation together.
vi.mock('@colyseus/core', () => ({
  Room: class {
    handlers = new Map<string, (client: Client, message: unknown) => void>();
    advance = () => {};
    broadcast = vi.fn();
    lock = vi.fn(async () => {});
    onMessage(
      type: string,
      handler: (client: Client, message: unknown) => void,
    ) {
      this.handlers.set(type, handler);
    }
    setFixedTimestep(callback: () => void) {
      this.advance = callback;
    }
  },
}));

test('one finisher transports both players; movement waits for the next barrier and the campaign ends', () => {
  const room = new GameRoom() as GameRoom & {
    handlers: Map<string, (client: Client, message: unknown) => void>;
    advance: () => void;
    broadcast: ReturnType<typeof vi.fn>;
  };
  const a = { sessionId: 'a' } as Client;
  const b = { sessionId: 'b' } as Client;
  const send = (client: Client, type: string, message: unknown) =>
    room.handlers.get(type)!(client, message);
  const step = (ticks: number) => {
    for (let i = 0; i < ticks; i++) room.advance();
  };
  const latest = <T>(type: string): T =>
    [...room.broadcast.mock.calls]
      .reverse()
      .find((call) => call[0] === type)![1] as T;
  const lobby = () => latest<LobbySnapshot>('lobby');
  const snapshot = () => latest<GameSnapshot>('snapshot');
  room.onCreate();
  room.onJoin(a, { nickname: 'Alice' });
  room.onJoin(b, { nickname: 'Bob' });
  send(a, 'ready', { ready: true });
  send(b, 'ready', { ready: true });
  const loaded = (client: Client) =>
    send(client, 'loaded', {
      levelId: lobby().levelId,
      stageId: lobby().stageId,
    });
  loaded(a);
  loaded(b);
  step(180);
  expect(lobby().phase).toBe('playing');

  const complete = (jumps: number[]) => {
    let sequence = 0,
      nextJump = 0;
    while (lobby().phase === 'playing' && sequence < 1000) {
      const player = snapshot().players.find(
        (item) => item.sessionId === 'a',
      )!.state;
      const target = jumps[nextJump];
      const jump =
        target !== undefined && player.grounded && player.x >= target;
      if (jump) nextJump++;
      send(a, 'input', {
        levelId: lobby().levelId,
        stageId: lobby().stageId,
        sequence: ++sequence,
        direction: 1,
        jump,
      });
      step(1);
    }
    expect(lobby().phase).toBe('transition');
  };
  complete([650, 1450, 1830, 2210]);
  expect(
    snapshot().players.find((item) => item.sessionId === 'b')!.state.x,
  ).toBe(160);
  const finished = snapshot();
  step(119);
  expect(lobby().phase).toBe('transition');
  expect(snapshot()).toEqual(finished);
  step(1);
  expect(lobby()).toMatchObject({
    phase: 'loading',
    levelId: 'canyon-v1',
    stageId: 2,
  });
  send(a, 'loaded', { levelId: 'practice-v1', stageId: 1 });
  loaded(b);
  send(a, 'input', {
    levelId: 'canyon-v1',
    stageId: 2,
    sequence: 1,
    direction: 1,
    jump: true,
  });
  step(60);
  expect(lobby().phase).toBe('loading');
  expect(snapshot().players.map((player) => player.state.x)).toEqual([96, 160]);
  loaded(a);
  step(180);
  expect(lobby().phase).toBe('playing');
  complete([500, 1140, 1830, 2150]);
  step(120);
  expect(lobby()).toMatchObject({ phase: 'finished', stageId: 2 });
  const final = snapshot();
  step(300);
  expect(snapshot()).toEqual(final);
  expect(() => room.onAuth(a, { nickname: 'Cara' })).toThrow();
});
