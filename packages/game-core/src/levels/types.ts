import type { LevelGeometry, Rectangle } from '../types.js';
import type { MobSpawn } from '../mobs.js';

export interface LevelDefinition extends LevelGeometry {
  readonly id: string;
  readonly name: string;
  readonly finish: Rectangle;
  readonly mobs: readonly MobSpawn[];
}
