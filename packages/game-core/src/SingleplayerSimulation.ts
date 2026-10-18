import { createMobs, stepMobs, stepPlayerWithMobs } from './mobs.js';
import { createPlayer } from './player.js';
import { reachedFinish } from './levels.js';
import type { LevelDefinition } from './levels.js';
import type { PlayerInput } from './types.js';

export class SingleplayerSimulation {
  player;
  mobs;
  finished = false;

  constructor(private readonly level: LevelDefinition) {
    this.player = createPlayer(level);
    this.mobs = createMobs(level);
  }

  step(input: PlayerInput) {
    if (this.finished) return;
    this.mobs = stepMobs(this.mobs, this.level, [this.player]);
    this.player = stepPlayerWithMobs(
      this.player,
      input,
      this.level,
      this.mobs,
    ).player;
    this.finished = reachedFinish(this.player, this.level);
  }
}
