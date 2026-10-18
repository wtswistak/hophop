import { expect, test } from 'vitest';
import {
  createMobs,
  FIXED_STEP_MS,
  levels,
  practiceLevel,
  MOB_WIDTH,
  SingleplayerSimulation,
} from '@game/core';
import type { LevelDefinition } from '@game/core';
import { RoomSimulation } from './RoomSimulation.js';

const level: LevelDefinition = {
  ...levels[0]!,
  ...practiceLevel,
  mobs: [{ id: 'patrol', platformIndex: 0, x: 250, speed: 55 }],
};

test('mob contact respawns only the touching player identically offline and on the server, then level loading resets mobs', () => {
  const local = new SingleplayerSimulation(level);
  const room = new RoomSimulation();
  room.loadLevel(level, 1);
  room.addPlayer('a');
  room.addPlayer('b');
  let hit = false;
  for (let sequence = 1; sequence < 100; sequence++) {
    const before = local.player.x;
    const input = { direction: 1, jump: false } as const;
    local.step(input);
    room.receive('a', { ...input, sequence, levelId: level.id, stageId: 1 });
    room.step();
    const state = room.snapshot();
    expect(state.players[0]!.state).toEqual(local.player);
    expect(state.mobs).toEqual(local.mobs);
    if (local.player.x < before) {
      hit = true;
      expect(local.player).toMatchObject({
        ...level.spawn,
        velocityX: 0,
        velocityY: 0,
      });
      expect(state.players[1]!.state.x).toBe(160);
      expect(state.mobs[0]!.x).toBeLessThan(250);
      expect(state.mobs[0]!.alert).toBe(true);
      break;
    }
  }
  expect(hit).toBe(true);
  room.loadLevel(level, 2);
  expect(room.snapshot().mobs).toEqual(createMobs(level));
});

test('a player can jump over a mob; patrol stays on the platform and turns at both edges', () => {
  const local = new SingleplayerSimulation(level);
  let jumped = false;
  for (let tick = 0; tick < 100; tick++) {
    const jump =
      !jumped &&
      local.player.grounded &&
      local.mobs[0]!.x - local.player.x < 100;
    if (jump) jumped = true;
    const previousX = local.player.x;
    local.step({ direction: 1, jump });
    expect(local.player.x).toBeGreaterThanOrEqual(previousX);
  }
  expect(jumped).toBe(true);
  expect(local.player.x).toBeGreaterThan(local.mobs[0]!.x + MOB_WIDTH);
  const directions = new Set<number>();
  for (let tick = 0; tick < 1800; tick++) {
    local.step({ direction: 0, jump: false });
    const mob = local.mobs[0]!;
    directions.add(mob.direction);
    expect(mob.x).toBeGreaterThanOrEqual(0);
    expect(mob.x + MOB_WIDTH).toBeLessThanOrEqual(level.platforms[0]!.width);
  }
  expect(directions).toEqual(new Set([1, -1]));
});

test('patrol mobs keep their speed near players in both local and server simulation', () => {
  const patrolLevel: LevelDefinition = {
    ...level,
    mobs: [{ ...level.mobs[0]!, behavior: 'patrol' }],
  };
  const local = new SingleplayerSimulation(patrolLevel);
  const room = new RoomSimulation();
  room.loadLevel(patrolLevel, 1);
  room.addPlayer('a');
  for (let sequence = 1; sequence <= 120; sequence++) {
    const previous = local.mobs[0]!;
    const input = { direction: 1, jump: false } as const;
    local.step(input);
    room.receive('a', { ...input, sequence, levelId: level.id, stageId: 1 });
    room.step();
    expect(local.mobs[0]!.alert).toBe(false);
    expect(Math.abs(local.mobs[0]!.x - previous.x)).toBeLessThanOrEqual(
      (patrolLevel.mobs[0]!.speed * FIXED_STEP_MS) / 1000 + 1e-9,
    );
    expect(room.snapshot().mobs).toEqual(local.mobs);
    expect(room.snapshot().players[0]!.state).toEqual(local.player);
  }
});
