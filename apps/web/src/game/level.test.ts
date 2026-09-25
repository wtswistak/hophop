import { expect, test } from 'vitest';
import { createPlayer, stepPlayer } from '@game/core';
import { practiceLevel } from './level';

test('all gaps and the obstacle on the technical course can be crossed', () => {
  let player = createPlayer(practiceLevel);
  const jumpAt = [650, 1450, 1830, 2210];
  let nextJump = 0;
  for (let tick = 0; tick < 720; tick++) {
    const target = jumpAt[nextJump];
    const jump = target !== undefined && player.grounded && player.x >= target;
    if (jump) nextJump++;
    const previousX = player.x;
    player = stepPlayer(player, { direction: 1, jump }, practiceLevel);
    expect(player.x).toBeGreaterThanOrEqual(previousX);
  }
  expect(nextJump).toBe(jumpAt.length);
  expect(player.x).toBe(practiceLevel.width - 32);
});
