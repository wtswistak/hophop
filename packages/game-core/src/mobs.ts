import {
  createPlayer,
  FIXED_STEP_MS,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  stepPlayer,
} from './player.js';
import type { LevelDefinition } from './levels/types.js';
import type { PlayerInput, PlayerState } from './types.js';

export const MOB_WIDTH = 48;
export const MOB_HEIGHT = 36;

export interface MobSpawn {
  readonly id: string;
  readonly platformIndex: number;
  readonly x: number;
  readonly speed: number;
  readonly behavior?: 'patrol' | 'chase';
}

export interface MobState {
  id: string;
  x: number;
  y: number;
  direction: -1 | 1;
  alert: boolean;
}

export function createMobs(level: LevelDefinition): MobState[] {
  return level.mobs.map((spawn) => ({
    id: spawn.id,
    x: spawn.x,
    y: level.platforms[spawn.platformIndex]!.y - MOB_HEIGHT,
    direction: 1,
    alert: false,
  }));
}

export function stepMobs(
  mobs: readonly MobState[],
  level: LevelDefinition,
  players: readonly PlayerState[],
): MobState[] {
  return mobs.map((mob, index) => {
    const spawn = level.mobs[index]!;
    const platform = level.platforms[spawn.platformIndex]!;
    const left = platform.x;
    const right = platform.x + platform.width - MOB_WIDTH;
    const center = mob.x + MOB_WIDTH / 2;
    const target =
      spawn.behavior === 'patrol'
        ? undefined
        : players
            .filter((player) => {
              const playerCenter = player.x + PLAYER_WIDTH / 2;
              return (
                playerCenter >= left &&
                playerCenter <= platform.x + platform.width &&
                Math.abs(player.y + PLAYER_HEIGHT - platform.y) < 80 &&
                Math.abs(playerCenter - center) <= 220
              );
            })
            .sort(
              (a, b) =>
                Math.abs(a.x + PLAYER_WIDTH / 2 - center) -
                Math.abs(b.x + PLAYER_WIDTH / 2 - center),
            )[0];
    const direction = target
      ? target.x + PLAYER_WIDTH / 2 < center
        ? -1
        : 1
      : mob.direction;
    const speed = spawn.speed * (target ? 2 : 1);
    const x = mob.x + (direction * speed * FIXED_STEP_MS) / 1000;
    return {
      ...mob,
      x: Math.max(left, Math.min(right, x)),
      direction: x <= left ? 1 : x >= right ? -1 : direction,
      alert: target !== undefined,
    };
  });
}

// Resolve contact before checking the finish. A mob wins a simultaneous contact.
export function stepPlayerWithMobs(
  previous: PlayerState,
  input: PlayerInput,
  level: LevelDefinition,
  mobs: readonly MobState[],
) {
  const player = stepPlayer(previous, input, level);
  const hitMob = mobs.some(
    (mob) =>
      player.x < mob.x + MOB_WIDTH &&
      player.x + PLAYER_WIDTH > mob.x &&
      player.y < mob.y + MOB_HEIGHT &&
      player.y + PLAYER_HEIGHT > mob.y,
  );
  return { player: hitMob ? createPlayer(level) : player, hitMob };
}
