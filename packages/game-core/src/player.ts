import type { LevelGeometry, PlayerInput, PlayerState } from './types.js';

export const FIXED_STEP_MS = 1000 / 60;
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;
const STEP_SECONDS = FIXED_STEP_MS / 1000;
const MOVE_SPEED = 280;
const JUMP_SPEED = 660;
const GRAVITY = 1800;
const MAX_FALL_SPEED = 900;

export function createPlayer(level: LevelGeometry): PlayerState {
  return {
    ...level.spawn,
    velocityX: 0,
    velocityY: 0,
    grounded: false,
    facing: 1,
  };
}

// One fixed simulation tick; no rendering, clock or browser dependencies.
export function stepPlayer(
  previous: PlayerState,
  input: PlayerInput,
  level: LevelGeometry,
): PlayerState {
  const player = { ...previous };
  player.velocityX = input.direction * MOVE_SPEED;
  if (input.direction !== 0) player.facing = input.direction;
  if (input.jump && previous.grounded) player.velocityY = -JUMP_SPEED;
  player.velocityY = Math.min(
    player.velocityY + GRAVITY * STEP_SECONDS,
    MAX_FALL_SPEED,
  );

  let nextX = player.x + player.velocityX * STEP_SECONDS;
  for (const platform of level.platforms) {
    if (
      player.y >= platform.y + platform.height ||
      player.y + PLAYER_HEIGHT <= platform.y
    )
      continue;
    if (player.velocityX > 0 && player.x + PLAYER_WIDTH <= platform.x) {
      nextX = Math.min(nextX, platform.x - PLAYER_WIDTH);
    } else if (
      player.velocityX < 0 &&
      player.x >= platform.x + platform.width
    ) {
      nextX = Math.max(nextX, platform.x + platform.width);
    }
  }
  nextX = Math.max(0, Math.min(nextX, level.width - PLAYER_WIDTH));
  if (nextX !== player.x + player.velocityX * STEP_SECONDS)
    player.velocityX = 0;
  player.x = nextX;

  let nextY = player.y + player.velocityY * STEP_SECONDS;
  player.grounded = false;
  let hitVertical = false;
  for (const platform of level.platforms) {
    if (
      player.x >= platform.x + platform.width ||
      player.x + PLAYER_WIDTH <= platform.x
    )
      continue;
    if (
      player.velocityY >= 0 &&
      player.y + PLAYER_HEIGHT <= platform.y &&
      nextY + PLAYER_HEIGHT >= platform.y
    ) {
      nextY = platform.y - PLAYER_HEIGHT;
      hitVertical = true;
    } else if (
      player.velocityY < 0 &&
      player.y >= platform.y + platform.height &&
      nextY <= platform.y + platform.height
    ) {
      nextY = platform.y + platform.height;
      hitVertical = true;
    }
  }
  if (hitVertical) {
    player.grounded = player.velocityY >= 0;
    player.velocityY = 0;
  }
  player.y = nextY;
  return player.y > level.fallY ? createPlayer(level) : player;
}
