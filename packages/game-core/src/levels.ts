import { practiceLevel } from './practiceLevel.js';
import { PLAYER_HEIGHT, PLAYER_WIDTH } from './player.js';
import type { LevelGeometry, PlayerState, Rectangle } from './types.js';
import type { MobSpawn } from './mobs.js';

export interface LevelDefinition extends LevelGeometry {
  readonly id: string;
  readonly name: string;
  readonly finish: Rectangle;
  readonly mobs: readonly MobSpawn[];
}

// Short technical courses for testing progression; final maps come later.
export const levels: readonly LevelDefinition[] = [
  {
    ...practiceLevel,
    id: 'practice-v1',
    name: 'Wejście do kanionu',
    mobs: [{ id: 'scorpion-1', platformIndex: 4, x: 400, speed: 55 }],
    finish: { x: 3040, y: 280, width: 64, height: 180 },
  },
  {
    id: 'canyon-v1',
    name: 'Druga przeprawa',
    mobs: [{ id: 'scorpion-2', platformIndex: 5, x: 1540, speed: 70 }],
    width: 2800,
    fallY: 720,
    spawn: { x: 96, y: 412 },
    platforms: [
      { x: 0, y: 460, width: 550, height: 260 },
      { x: 690, y: 430, width: 500, height: 290 },
      { x: 1330, y: 460, width: 550, height: 260 },
      { x: 2020, y: 460, width: 780, height: 260 },
      { x: 2220, y: 412, width: 70, height: 48 },
      { x: 1500, y: 370, width: 160, height: 24 },
    ],
    finish: { x: 2640, y: 280, width: 64, height: 180 },
  },
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
