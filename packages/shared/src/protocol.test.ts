import { expect, test } from 'vitest';
import { createPlayer, practiceLevel } from '@game/core';
import { isGameSnapshot, isInputCommand, LEVEL_ID } from './index.js';

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
