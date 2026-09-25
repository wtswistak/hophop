import { describe, expect, test } from 'vitest';
import {
  createPlayer,
  stepPlayer,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
} from './index.js';
import type { LevelGeometry, PlayerInput, PlayerState } from './index.js';

const floor: LevelGeometry = {
  width: 2000,
  fallY: 720,
  spawn: { x: 96, y: 412 },
  platforms: [{ x: 0, y: 460, width: 2000, height: 260 }],
};
const idle: PlayerInput = { direction: 0, jump: false };
function run(player: PlayerState, ticks: number, input = idle, level = floor) {
  for (let i = 0; i < ticks; i++) player = stepPlayer(player, input, level);
  return player;
}
const standing = () => run(createPlayer(floor), 1);

describe('fixed-step platforming', () => {
  test('lands and remains on the floor without sinking', () => {
    const player = run({ ...createPlayer(floor), y: 0 }, 180);
    expect(player.y + PLAYER_HEIGHT).toBe(460);
    expect(player.velocityY).toBe(0);
    expect(player.grounded).toBe(true);
  });
  test('moves in both directions and stops on release without mutating the previous state', () => {
    const start = standing();
    const right = run(start, 60, { direction: 1, jump: false });
    expect(right.x - start.x).toBeCloseTo(280);
    expect(start.x).toBe(96);
    const left = run(right, 60, { direction: -1, jump: false });
    expect(left.x).toBeCloseTo(start.x);
    expect(left.facing).toBe(-1);
    expect(run(left, 10).x).toBe(left.x);
    expect(run(left, 10).velocityX).toBe(0);
  });
  test('a jump rises, cannot jump again mid-air, and lands', () => {
    const jumped = stepPlayer(standing(), { direction: 0, jump: true }, floor);
    expect(jumped.y).toBeLessThan(412);
    expect(jumped.grounded).toBe(false);
    const secondPress = stepPlayer(jumped, { direction: 0, jump: true }, floor);
    expect(secondPress.velocityY).toBeGreaterThan(jumped.velocityY);
    expect(run(secondPress, 90).y).toBe(412);
  });
  test('collides with a wall from either side', () => {
    const wallLevel = {
      ...floor,
      platforms: [
        ...floor.platforms,
        { x: 200, y: 300, width: 40, height: 160 },
      ],
    };
    const right = run(standing(), 60, { direction: 1, jump: false }, wallLevel);
    expect(right.x + PLAYER_WIDTH).toBe(200);
    expect(right.velocityX).toBe(0);
    const left = run(
      { ...standing(), x: 300 },
      60,
      { direction: -1, jump: false },
      wallLevel,
    );
    expect(left.x).toBe(240);
  });
  test('hits the underside of a platform and starts falling', () => {
    const ceiling = {
      ...floor,
      platforms: [...floor.platforms, { x: 0, y: 330, width: 500, height: 20 }],
    };
    let player = stepPlayer(standing(), { direction: 0, jump: true }, ceiling);
    for (let i = 0; i < 30; i++) {
      player = stepPlayer(player, idle, ceiling);
      expect(player.y).toBeGreaterThanOrEqual(350);
    }
    expect(player.velocityY).toBeGreaterThanOrEqual(0);
  });
  test('fast falls land on thin platforms and choose the nearest surface regardless of order', () => {
    const platforms = [
      { x: 0, y: 220, width: 500, height: 2 },
      { x: 0, y: 200, width: 500, height: 2 },
    ];
    const player = { ...standing(), y: 145, velocityY: 900, grounded: false };
    for (const ordered of [platforms, [...platforms].reverse()]) {
      const result = stepPlayer(player, idle, { ...floor, platforms: ordered });
      expect(result.y).toBe(200 - PLAYER_HEIGHT);
      expect(result.grounded).toBe(true);
    }
  });
  test('walking into a gap removes ground contact', () => {
    const gap = {
      ...floor,
      platforms: [{ x: 0, y: 460, width: 100, height: 260 }],
    };
    const player = run(standing(), 10, { direction: 1, jump: false }, gap);
    expect(player.grounded).toBe(false);
    expect(player.y).toBeGreaterThan(412);
  });
  test('falling resets position and both velocities to the level start', () => {
    const fallen = {
      ...standing(),
      x: 1300,
      y: 721,
      velocityX: 280,
      velocityY: 900,
    };
    expect(stepPlayer(fallen, idle, floor)).toEqual(createPlayer(floor));
  });
  test('clamps movement to horizontal world boundaries', () => {
    expect(run(standing(), 120, { direction: -1, jump: false }).x).toBe(0);
    const player = run({ ...standing(), x: 1990 - PLAYER_WIDTH }, 120, {
      direction: 1,
      jump: false,
    });
    expect(player.x).toBe(2000 - PLAYER_WIDTH);
  });
});

test('exact contact with the floor counts as landing in the same tick', () => {
  const player = { ...standing(), y: 411.5, velocityY: 0, grounded: false };
  const landed = stepPlayer(player, idle, floor);
  expect(landed.y).toBe(412);
  expect(landed.grounded).toBe(true);
  expect(
    stepPlayer(landed, { direction: 0, jump: true }, floor).y,
  ).toBeLessThan(412);
});
