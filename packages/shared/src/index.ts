import { getLevel } from '@game/core';
import type { MobState, PlayerInput, PlayerState } from '@game/core';

export const ROOM_TYPE = 'practice';
export const LEVEL_ID = 'practice-v1';
export const MAX_PLAYERS = 2;
export const SNAPSHOT_EVERY_TICKS = 3;
export const MAX_PENDING_INPUTS = 120;

export type LobbyPhase =
  | 'waiting'
  | 'loading'
  | 'countdown'
  | 'playing'
  | 'transition'
  | 'finished'
  | 'aborted';
export interface LobbyPlayer {
  sessionId: string;
  nickname: string;
  slot: 1 | 2;
  ready: boolean;
  loaded: boolean;
}
export interface StageIdentity {
  levelId: string;
  stageId: number;
}

export interface LobbySnapshot extends StageIdentity {
  phase: LobbyPhase;
  players: LobbyPlayer[];
  countdownSeconds: number | null;
}
export interface PublicLobby {
  roomId: string;
  players: number;
}

export function parseNickname(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const nickname = value.trim();
  return nickname.length >= 2 &&
    nickname.length <= 20 &&
    !/\p{Cc}/u.test(nickname)
    ? nickname
    : null;
}

export function isReadyMessage(value: unknown): value is { ready: boolean } {
  return (
    isRecord(value) &&
    Object.keys(value).length === 1 &&
    typeof value.ready === 'boolean'
  );
}

export function isLobbySnapshot(value: unknown): value is LobbySnapshot {
  if (
    !isRecord(value) ||
    !isStageIdentity(value) ||
    ![
      'waiting',
      'loading',
      'countdown',
      'playing',
      'transition',
      'finished',
      'aborted',
    ].includes(value.phase as string) ||
    !Array.isArray(value.players) ||
    value.players.length > MAX_PLAYERS ||
    (value.phase === 'countdown'
      ? !Number.isInteger(value.countdownSeconds) ||
        (value.countdownSeconds as number) < 1 ||
        (value.countdownSeconds as number) > 3
      : value.countdownSeconds !== null)
  )
    return false;
  const ids = new Set<string>();
  const slots = new Set<number>();
  return value.players.every((player: unknown) => {
    if (
      !isRecord(player) ||
      typeof player.sessionId !== 'string' ||
      !player.sessionId ||
      ids.has(player.sessionId) ||
      typeof player.nickname !== 'string' ||
      parseNickname(player.nickname) !== player.nickname ||
      (player.slot !== 1 && player.slot !== 2) ||
      slots.has(player.slot) ||
      typeof player.ready !== 'boolean' ||
      typeof player.loaded !== 'boolean'
    )
      return false;
    ids.add(player.sessionId);
    slots.add(player.slot);
    return true;
  });
}

export function isPublicLobbyList(value: unknown): value is PublicLobby[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(
      (room: unknown) =>
        isRecord(room) &&
        Object.keys(room).length === 2 &&
        typeof room.roomId === 'string' &&
        room.roomId.length > 0 &&
        room.roomId.length <= 64 &&
        Number.isInteger(room.players) &&
        (room.players as number) >= 0 &&
        (room.players as number) < MAX_PLAYERS,
    )
  );
}

export interface InputCommand extends PlayerInput, StageIdentity {
  sequence: number;
}

export interface PlayerSnapshot {
  sessionId: string;
  state: PlayerState;
  lastProcessedSequence: number;
}

export interface GameSnapshot extends StageIdentity {
  mobs: MobState[];
  tick: number;
  players: PlayerSnapshot[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isInputCommand(value: unknown): value is InputCommand {
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).length === 5 &&
    Number.isSafeInteger(value.sequence) &&
    (value.sequence as number) > 0 &&
    isStageIdentity(value) &&
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
    !isStageIdentity(value) ||
    !Number.isSafeInteger(value.tick) ||
    (value.tick as number) < 0 ||
    !Array.isArray(value.players) ||
    value.players.length > MAX_PLAYERS
  )
    return false;
  const level = getLevel(value.levelId as string)!;
  if (!Array.isArray(value.mobs) || value.mobs.length !== level.mobs.length)
    return false;
  const mobIds = new Set<string>();
  if (
    !value.mobs.every((mob: unknown) => {
      if (
        !isRecord(mob) ||
        typeof mob.id !== 'string' ||
        mobIds.has(mob.id) ||
        !level.mobs.some((spawn) => spawn.id === mob.id) ||
        typeof mob.x !== 'number' ||
        !Number.isFinite(mob.x) ||
        typeof mob.alert !== 'boolean' ||
        typeof mob.y !== 'number' ||
        !Number.isFinite(mob.y) ||
        (mob.direction !== -1 && mob.direction !== 1)
      )
        return false;
      mobIds.add(mob.id);
      return true;
    })
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

function isStageIdentity(value: Record<string, unknown>): boolean {
  return (
    typeof value.levelId === 'string' &&
    getLevel(value.levelId) !== undefined &&
    Number.isSafeInteger(value.stageId) &&
    (value.stageId as number) > 0
  );
}

export function isLoadedMessage(value: unknown): value is StageIdentity {
  return (
    isRecord(value) && Object.keys(value).length === 2 && isStageIdentity(value)
  );
}
