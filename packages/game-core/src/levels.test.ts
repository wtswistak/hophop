import { expect, test } from 'vitest';
import { createPlayer, PLAYER_WIDTH, stepPlayer } from './player.js';
import { levels, reachedFinish } from './levels.js';

test.each([
  [0, [650, 1450, 1830, 2210]],
  [1, [500, 1140, 1830, 2150]],
] as const)(
  'technical level %i can be completed without respawning',
  (index, jumps) => {
    const level = levels[index]!;
    let player = createPlayer(level);
    let nextJump = 0;
    let finished = false;
    for (let tick = 0; tick < 900; tick++) {
      const target = jumps[nextJump];
      const jump =
        target !== undefined && player.grounded && player.x >= target;
      if (jump) nextJump++;
      const before = player.x;
      player = stepPlayer(player, { direction: 1, jump }, level);
      expect(player.x).toBeGreaterThanOrEqual(before);
      if (reachedFinish(player, level)) {
        finished = true;
        break;
      }
    }
    expect(finished).toBe(true);
    expect(nextJump).toBe(jumps.length);
  },
);

test('finish requires body overlap in both axes', () => {
  const level = levels[0]!;
  const player = {
    ...createPlayer(level),
    x: level.finish.x - PLAYER_WIDTH,
    y: level.finish.y,
  };
  expect(reachedFinish(player, level)).toBe(false);
  player.x++;
  expect(reachedFinish(player, level)).toBe(true);
  player.y = level.finish.y + level.finish.height;
  expect(reachedFinish(player, level)).toBe(false);
});
