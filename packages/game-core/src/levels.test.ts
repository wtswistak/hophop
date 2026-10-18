import { expect, test } from 'vitest';
import { createPlayer, PLAYER_HEIGHT, PLAYER_WIDTH } from './player.js';
import { levels, reachedFinish } from './levels.js';
import { SingleplayerSimulation } from './SingleplayerSimulation.js';
import { MOB_HEIGHT } from './mobs.js';

test.each([
  [
    0,
    [
      350, 660, 1160, 1700, 2120, 2370, 2680, 3400, 3860, 4420, 4690, 4920,
      5460, 6200, 6660, 7220, 7490, 7720, 8240,
    ],
  ],
  [1, [500, 1140, 1830, 2150]],
] as const)(
  'campaign level %i can be completed with active mobs without respawning',
  (index, jumps) => {
    const level = levels[index]!;
    const simulation = new SingleplayerSimulation(level);
    let nextJump = 0;
    let finished = false;
    for (let tick = 0; tick < 60 * 90; tick++) {
      const player = simulation.player;
      const target = jumps[nextJump];
      const routeJump = target !== undefined && player.x >= target;
      const mobAhead = simulation.mobs.some(
        (mob, index) =>
          mob.x > player.x &&
          mob.x - player.x <
            (level.mobs[index]!.behavior === 'patrol' ? 75 : 120) &&
          Math.abs(mob.y + MOB_HEIGHT - (player.y + PLAYER_HEIGHT)) < 40,
      );
      // Wait before a gap if a patrol occupies the next landing.
      const landingBlocked =
        routeJump &&
        simulation.mobs.some((mob, index) => {
          const course = level;
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
      simulation.step({
        direction: landingBlocked || (!player.grounded && routeJump) ? 0 : 1,
        jump,
      });
      expect(simulation.player.x).toBeGreaterThanOrEqual(player.x);
      if (simulation.finished) {
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
