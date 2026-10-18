import { PLAYER_HEIGHT, PLAYER_WIDTH } from './player.js';
import type { PlayerState } from './types.js';
import type { LevelDefinition } from './levels/types.js';
import { canyonEntrance } from './levels/canyonEntrance.js';
import { canyonCrossing } from './levels/canyonCrossing.js';

export type { LevelDefinition } from './levels/types.js';

export const levels: readonly LevelDefinition[] = [
  canyonEntrance,
  canyonCrossing,
];

export function getLevel(id: string): LevelDefinition | undefined {
  return levels.find((level) => level.id === id);
}

export function reachedFinish(
  player: PlayerState,
  level: LevelDefinition,
): boolean {
  const finish = level.finish;
  return (
    player.x < finish.x + finish.width &&
    player.x + PLAYER_WIDTH > finish.x &&
    player.y < finish.y + finish.height &&
    player.y + PLAYER_HEIGHT > finish.y
  );
}
