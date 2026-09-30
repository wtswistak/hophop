import { expect, test } from 'vitest';
import { createPlayer, practiceLevel } from '@game/core';
import {
  isGameSnapshot,
  isInputCommand,
  isLobbySnapshot,
  isPublicLobbyList,
  isReadyMessage,
  LEVEL_ID,
  parseNickname,
} from './index.js';

test('input validation rejects missing, excessive and wrongly typed fields', () => {
  const command = { sequence: 1, levelId: LEVEL_ID, direction: 0, jump: false };
  expect(isInputCommand(command)).toBe(true);
  for (const value of [
    [],
    null,
    {},
    { ...command, sequence: NaN },
    { ...command, sequence: -1 },
    { ...command, sequence: 1.1 },
    { ...command, sessionId: 'someone-else' },
    { ...command, jump: 1 },
  ]) {
    expect(isInputCommand(value)).toBe(false);
  }
});

test('validates nicknames and lobby control messages', () => {
  expect(parseNickname(' Alice ')).toBe('Alice');
  for (const value of ['A', 'A'.repeat(21), 'A\u0000B', null])
    expect(parseNickname(value)).toBeNull();
  expect(isReadyMessage({ ready: true })).toBe(true);
  expect(isReadyMessage({ ready: true, sessionId: 'other' })).toBe(false);
  expect(isReadyMessage({ ready: 'yes' })).toBe(false);
});

test('rejects malformed lobby snapshots and lists', () => {
  const player = {
    sessionId: 'a',
    nickname: 'Alice',
    slot: 1,
    ready: false,
    loaded: false,
  };
  const lobby = { phase: 'waiting', players: [player], countdownSeconds: null };
  expect(isLobbySnapshot(lobby)).toBe(true);
  expect(isLobbySnapshot({ ...lobby, players: [player, player] })).toBe(false);
  expect(
    isLobbySnapshot({
      ...lobby,
      players: [{ ...player, nickname: '<script>' }],
    }),
  ).toBe(true);
  expect(
    isLobbySnapshot({
      ...lobby,
      players: [{ ...player, nickname: 'A\u0000B' }],
    }),
  ).toBe(false);
  expect(
    isLobbySnapshot({ ...lobby, phase: 'countdown', countdownSeconds: 4 }),
  ).toBe(false);
  expect(isPublicLobbyList([{ roomId: 'room', players: 1 }])).toBe(true);
  expect(isPublicLobbyList([{ roomId: 'room', players: 2 }])).toBe(false);
});

test('snapshot validation rejects duplicate players, nonfinite states and incorrect levels', () => {
  const player = {
    sessionId: 'a',
    state: createPlayer(practiceLevel),
    lastProcessedSequence: 0,
  };
  const state = { tick: 0, levelId: LEVEL_ID, players: [player] };
  expect(isGameSnapshot(state)).toBe(true);
  expect(isGameSnapshot({ ...state, players: [player, player] })).toBe(false);
  expect(isGameSnapshot({ ...state, tick: -1 })).toBe(false);
  expect(isGameSnapshot({ ...state, levelId: 'other' })).toBe(false);
  expect(
    isGameSnapshot({
      ...state,
      players: [{ ...player, state: { ...player.state, x: Infinity } }],
    }),
  ).toBe(false);
});
