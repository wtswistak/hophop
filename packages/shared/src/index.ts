import type { PlayerInput, PlayerState } from '@game/core';

export const ROOM_TYPE = 'practice';
export const LEVEL_ID = 'practice-v1';
export const MAX_PLAYERS = 2;
export const SNAPSHOT_EVERY_TICKS = 3;
export const MAX_PENDING_INPUTS = 120;

export interface InputCommand extends PlayerInput {
  sequence: number;
  levelId: typeof LEVEL_ID;
}

export interface PlayerSnapshot {
  sessionId: string;
  state: PlayerState;
  lastProcessedSequence: number;
}

export interface GameSnapshot {
  tick: number;
  levelId: typeof LEVEL_ID;
  players: PlayerSnapshot[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isInputCommand(value: unknown): value is InputCommand {
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).length === 4 &&
    Number.isSafeInteger(value.sequence) &&
    (value.sequence as number) > 0 &&
    value.levelId === LEVEL_ID &&
    (value.direction === -1 ||
      value.direction === 0 ||
      value.direction === 1) &&
    typeof value.jump === 'boolean'
  );
}

function isPlayerState(value: unknown): value is PlayerState {
  if (!isRecord(value)) return false;
  return (
    ['x', 'y', 'velocityX', 'velocityY'].every(
      (key) => typeof value[key] === 'number' && Number.isFinite(value[key]),
    ) &&
    typeof value.grounded === 'boolean' &&
    (value.facing === -1 || value.facing === 1)
  );
}

export function isGameSnapshot(value: unknown): value is GameSnapshot {
  if (
    !isRecord(value) ||
    value.levelId !== LEVEL_ID ||
    !Number.isSafeInteger(value.tick) ||
    (value.tick as number) < 0 ||
    !Array.isArray(value.players) ||
    value.players.length > MAX_PLAYERS
  )
    return false;
  const ids = new Set<string>();
  return value.players.every((player: unknown) => {
    if (
      !isRecord(player) ||
      typeof player.sessionId !== 'string' ||
      ids.has(player.sessionId) ||
      !Number.isSafeInteger(player.lastProcessedSequence) ||
      (player.lastProcessedSequence as number) < 0 ||
      !isPlayerState(player.state)
    )
      return false;
    ids.add(player.sessionId);
    return true;
  });
}
