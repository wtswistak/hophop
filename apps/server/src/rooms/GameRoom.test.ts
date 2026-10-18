import { expect, test, vi } from 'vitest';
import { getLevel, MOB_HEIGHT, PLAYER_HEIGHT, PLAYER_WIDTH } from '@game/core';
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
    while (lobby().phase === 'playing' && sequence < 60 * 90) {
      const player = snapshot().players.find(
        (item) => item.sessionId === 'a',
      )!.state;
      const target = jumps[nextJump];
      const routeJump = target !== undefined && player.x >= target;
      const mobAhead = snapshot().mobs.some(
        (mob, index) =>
          mob.x > player.x &&
          mob.x - player.x <
            (getLevel(lobby().levelId)!.mobs[index]!.behavior === 'patrol'
              ? 75
              : 120) &&
          Math.abs(mob.y + MOB_HEIGHT - (player.y + PLAYER_HEIGHT)) < 40,
      );
      // Wait before a gap if a patrol occupies the next landing.
      const landingBlocked =
        routeJump &&
        snapshot().mobs.some((mob, index) => {
          const course = getLevel(lobby().levelId)!;
          const platform = course.platforms[course.mobs[index]!.platformIndex]!;
          return (
            platform.x > player.x + PLAYER_WIDTH &&
            mob.x > player.x &&
            mob.x - player.x < 320
          );
        });
      const jump =
        player.grounded && !landingBlocked && (routeJump || mobAhead);
      if (jump && routeJump) nextJump++;
      send(a, 'input', {
        levelId: lobby().levelId,
        stageId: lobby().stageId,
        sequence: ++sequence,
        direction: landingBlocked || (!player.grounded && routeJump) ? 0 : 1,
        jump,
      });
      step(1);
      expect(
        snapshot().players.find((item) => item.sessionId === 'a')!.state.x,
      ).toBeGreaterThanOrEqual(player.x);
    }
    expect(lobby().phase).toBe('transition');
  };
  complete([
    350, 660, 1160, 1700, 2120, 2370, 2680, 3400, 3860, 4420, 4690, 4920, 5460,
    6200, 6660, 7220, 7490, 7720, 8240,
  ]);
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
