import { expect, test } from 'vitest';
import { practiceLevel } from '@game/core';
import { LEVEL_ID } from '@game/shared';
import { RoomSimulation } from './RoomSimulation.js';

const command = (
  sequence: number,
  direction: -1 | 0 | 1 = 1,
  jump = false,
) => ({ sequence, direction, jump, levelId: LEVEL_ID });
function player(room: RoomSimulation, id = 'a') {
  return room.snapshot().players.find((item) => item.sessionId === id)!;
}

test('two players have independent states; a third seat is rejected and a departed seat can be reused', () => {
  const room = new RoomSimulation();
  room.addPlayer('a');
  room.addPlayer('b');
  expect(() => room.addPlayer('c')).toThrow('Room is full');
  const startB = player(room, 'b').state.x;
  room.receive('a', command(1));
  room.step();
  expect(player(room).state.x).toBeGreaterThan(practiceLevel.spawn.x);
  expect(player(room, 'b').state.x).toBe(startB);
  room.removePlayer('b');
  room.addPlayer('c');
  expect(room.snapshot().players.map((item) => item.sessionId)).toEqual([
    'a',
    'c',
  ]);
});

test('position injection, old levels, duplicates and invalid data do not affect authoritative state', () => {
  const room = new RoomSimulation();
  room.addPlayer('a');
  for (const input of [
    null,
    [],
    { ...command(1), x: 3000 },
    { ...command(1), direction: 2 },
    { ...command(1), jump: 'yes' },
    { ...command(1), sequence: Infinity },
    { ...command(1), levelId: 'other' },
  ]) {
    expect(room.receive('a', input)).toBe(false);
  }
  expect(room.receive('a', command(1))).toBe(true);
  expect(room.receive('a', command(1))).toBe(false);
  expect(room.receive('unknown', command(2))).toBe(false);
  room.step();
  expect(player(room).lastProcessedSequence).toBe(1);
  expect(player(room).state.x).toBeCloseTo(96 + 280 / 60);
});

test('input bursts cannot run extra physics steps or create an unbounded queue', () => {
  const room = new RoomSimulation();
  room.addPlayer('a');
  for (let i = 1; i <= 120; i++) room.receive('a', command(i));
  room.step();
  expect(player(room).state.x).toBeCloseTo(96 + 280 / 60);
  expect(player(room).lastProcessedSequence).toBe(1);
  for (let i = 0; i < 20; i++) room.step();
  expect(player(room).lastProcessedSequence).toBe(12);
  expect(player(room).state.velocityX).toBe(0);
  const x = player(room).state.x;
  room.step();
  expect(player(room).state.x).toBe(x);
});

test('stop immediately clears queued movement and does not replay a queued jump', () => {
  const room = new RoomSimulation();
  room.addPlayer('a');
  room.step();
  room.receive('a', command(1, 1, true));
  room.receive('a', command(2));
  expect(room.receive('a', command(3, 0), true)).toBe(true);
  room.step();
  expect(player(room).lastProcessedSequence).toBe(3);
  expect(player(room).state.x).toBe(96);
  expect(player(room).state.y).toBe(412);
  expect(room.receive('a', command(4, 1), true)).toBe(false);
});

test('the input budget resets only after a server second', () => {
  const room = new RoomSimulation();
  room.addPlayer('a');
  for (let i = 0; i < 120; i++) room.receive('a', null);
  expect(room.receive('a', command(1))).toBe(false);
  for (let i = 0; i < 60; i++) room.step();
  expect(room.receive('a', command(1))).toBe(true);
});

test('the server respawns a falling player without resetting the other player', () => {
  const room = new RoomSimulation();
  room.addPlayer('a');
  room.addPlayer('b');
  let respawned = false;
  for (let i = 1; i < 240; i++) {
    const before = player(room).state.x;
    room.receive('a', command(i));
    room.step();
    if (player(room).state.x < before) {
      expect(player(room).state).toMatchObject({
        ...practiceLevel.spawn,
        velocityX: 0,
        velocityY: 0,
      });
      respawned = true;
      break;
    }
  }
  expect(respawned).toBe(true);
  expect(player(room, 'b').state.x).toBe(160);
});
