import { expect, test } from 'vitest';
import { createPlayer, practiceLevel, stepPlayer } from '@game/core';
import { LEVEL_ID } from '@game/shared';
import type { GameSnapshot, InputCommand } from '@game/shared';
import { MultiplayerSession } from './MultiplayerSession';

const snapshot = (tick = 1): GameSnapshot => ({
  tick,
  levelId: LEVEL_ID,
  players: [
    {
      sessionId: 'a',
      state: createPlayer(practiceLevel),
      lastProcessedSequence: 0,
    },
    {
      sessionId: 'b',
      state: { ...createPlayer(practiceLevel), x: 160 },
      lastProcessedSequence: 0,
    },
  ],
});
const right = { direction: 1, jump: false } as const;

test('predicts immediately, acknowledges processed input and replays remaining commands', () => {
  const sent: InputCommand[] = [];
  const session = new MultiplayerSession(
    'room',
    'a',
    (_type, input) => sent.push(input),
    () => {},
  );
  session.receive(snapshot(), 0);
  session.advance(right);
  session.advance(right);
  session.advance(right);
  expect(session.player.x).toBeCloseTo(110);
  const authoritative = snapshot(4);
  authoritative.players[0]!.state = stepPlayer(
    createPlayer(practiceLevel),
    right,
    practiceLevel,
  );
  authoritative.players[0]!.lastProcessedSequence = 1;
  session.receive(authoritative, 50);
  expect(session.player.x).toBeCloseTo(110);
  expect(sent.map((input) => input.sequence)).toEqual([1, 2, 3]);
  expect(sent[0]).not.toHaveProperty('x');
  // A server correction takes precedence over any local state.
  session.player.x = 3000;
  authoritative.tick = 5;
  session.receive(authoritative, 70);
  expect(session.player.x).toBeCloseTo(110);
});

test('interpolates the other player and snaps across respawn instead of flying through the map', () => {
  const session = new MultiplayerSession(
    'room',
    'a',
    () => {},
    () => {},
  );
  session.receive(snapshot(0), 0);
  const next = snapshot(6);
  next.players[1]!.state.x = 188;
  session.receive(next, 100);
  expect(session.remotePlayers(150)[0]!.state.x).toBeCloseTo(174);
  const fall = snapshot(9);
  fall.players[1]!.state.x = 800;
  fall.players[1]!.state.y = 700;
  session.receive(fall, 150);
  const respawn = snapshot(12);
  respawn.players[1]!.state.x = 96;
  session.receive(respawn, 200);
  expect(session.remotePlayers(275)[0]!.state.x).toBe(96);
});

test('rejects invalid, outdated and impossible acknowledgements and removes departed players', () => {
  const session = new MultiplayerSession(
    'room',
    'a',
    () => {},
    () => {},
  );
  expect(session.receive(null, 0)).toBe(false);
  session.receive(snapshot(5), 0);
  expect(session.receive(snapshot(4), 0)).toBe(false);
  const invalid = snapshot(6);
  invalid.players[0]!.lastProcessedSequence = 10;
  expect(session.receive(invalid, 0)).toBe(false);
  const single = snapshot(6);
  single.players.pop();
  session.receive(single, 100);
  expect(session.remotePlayers(100)).toEqual([]);
  expect(session.getStatus().playerCount).toBe(1);
});

test('bounds unacknowledged prediction and stops publishing after disconnection', () => {
  let sent = 0,
    left = 0;
  const session = new MultiplayerSession(
    'room',
    'a',
    () => {
      sent++;
    },
    () => {
      left++;
    },
  );
  session.receive(snapshot(), 0);
  for (let i = 0; i < 200; i++) session.advance(right);
  expect(sent).toBe(120);
  session.stop();
  expect(sent).toBe(121);
  session.close();
  session.advance(right);
  expect(sent).toBe(121);
  expect(left).toBe(1);
  expect(session.getStatus().connected).toBe(false);
});
