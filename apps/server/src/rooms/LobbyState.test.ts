import { expect, test } from 'vitest';
import { LobbyState } from './LobbyState.js';

test('requires two ready players, both load acknowledgements and a three second countdown', () => {
  const lobby = new LobbyState();
  expect(lobby.add('a', ' Alice ')).toBe(true);
  expect(lobby.add('b', 'Bob')).toBe(true);
  expect(lobby.add('c', 'Eve')).toBe(false);
  expect(
    lobby.snapshot(0).players.map((player) => [player.nickname, player.slot]),
  ).toEqual([
    ['Alice', 1],
    ['Bob', 2],
  ]);
  expect(lobby.setLoaded('a', 0, 1)).toBe(false);
  lobby.setReady('a', true, 0);
  expect(lobby.phase).toBe('waiting');
  lobby.setReady('b', true, 0);
  expect(lobby.phase).toBe('loading');
  expect(lobby.setReady('a', true, 0)).toBe(false);
  expect(lobby.setLoaded('a', 0, 1)).toBe(true);
  expect(lobby.phase).toBe('loading');
  expect(lobby.setLoaded('b', 0, 1)).toBe(true);
  expect(lobby.phase).toBe('countdown');
  expect(lobby.snapshot(0).countdownSeconds).toBe(3);
  lobby.step(60);
  expect(lobby.snapshot(60).countdownSeconds).toBe(2);
  lobby.step(179);
  expect(lobby.phase).toBe('countdown');
  lobby.step(180);
  expect(lobby.phase).toBe('playing');
  expect(lobby.add('c', 'Eve')).toBe(false);
  expect(lobby.setReady('a', false, 180)).toBe(false);
});

test('unready and departure prevent starting; free slot is reused', () => {
  const lobby = new LobbyState();
  lobby.add('a', 'Alice');
  lobby.add('b', 'Bob');
  lobby.setReady('a', true, 0);
  lobby.setReady('a', false, 0);
  lobby.setReady('b', true, 0);
  expect(lobby.phase).toBe('waiting');
  lobby.setReady('a', true, 0);
  expect(lobby.phase).toBe('loading');
  lobby.remove('a');
  expect(lobby.phase).toBe('waiting');
  expect(lobby.snapshot(0).players[0]).toMatchObject({
    nickname: 'Bob',
    ready: false,
    slot: 2,
  });
  lobby.add('c', 'Cara');
  expect(lobby.snapshot(0).players[1]).toMatchObject({
    nickname: 'Cara',
    slot: 1,
  });
});

test('load timeout clears readiness and permits retry', () => {
  const lobby = new LobbyState();
  lobby.add('a', 'Alice');
  lobby.add('b', 'Bob');
  lobby.setReady('a', true, 10);
  lobby.setReady('b', true, 10);
  lobby.setLoaded('a', 10, 1);
  expect(lobby.step(1809)).toBe(false);
  expect(lobby.step(1810)).toBe(true);
  expect(lobby.snapshot(1810)).toMatchObject({
    phase: 'waiting',
    players: [
      { ready: false, loaded: false },
      { ready: false, loaded: false },
    ],
  });
  lobby.setReady('a', true, 1811);
  lobby.setReady('b', true, 1811);
  expect(lobby.phase).toBe('loading');
});

test('invalid nicknames do not take seats', () => {
  const lobby = new LobbyState();
  expect(lobby.add('a', 'A')).toBe(false);
  expect(lobby.add('a', 'A\u0000B')).toBe(false);
  expect(lobby.add('a', 'A'.repeat(21))).toBe(false);
  expect(lobby.add('a', 'Alice')).toBe(true);
});

function playingLobby() {
  const lobby = new LobbyState();
  lobby.add('a', 'Alice');
  lobby.add('b', 'Bob');
  lobby.setReady('a', true, 0);
  lobby.setReady('b', true, 0);
  lobby.setLoaded('a', 0, 1);
  lobby.setLoaded('b', 0, 1);
  lobby.step(180);
  return lobby;
}

test('simultaneous finishes advance once after two seconds, wait for both clients and end after the final map', () => {
  const lobby = playingLobby();
  expect(lobby.finish(200)).toBe(true);
  expect(lobby.finish(200)).toBe(false);
  lobby.step(319);
  expect(lobby.phase).toBe('transition');
  lobby.step(320);
  expect(lobby.snapshot(320)).toMatchObject({
    phase: 'loading',
    stageId: 2,
    levelId: 'canyon-v1',
  });
  expect(lobby.setLoaded('a', 320, 1)).toBe(false);
  expect(lobby.setLoaded('a', 320, 2)).toBe(true);
  expect(lobby.setLoaded('a', 320, 2)).toBe(false);
  lobby.step(500);
  expect(lobby.phase).toBe('loading');
  lobby.setLoaded('b', 500, 2);
  lobby.step(679);
  expect(lobby.phase).toBe('countdown');
  lobby.step(680);
  expect(lobby.phase).toBe('playing');
  lobby.finish(700);
  lobby.step(820);
  expect(lobby.phase).toBe('finished');
  expect(lobby.finish(821)).toBe(false);
  lobby.step(10000);
  expect(lobby.snapshot(10000)).toMatchObject({
    phase: 'finished',
    stageId: 2,
    levelId: 'canyon-v1',
  });
});

test('retry cannot reuse an acknowledgement from an expired loading attempt', () => {
  const lobby = new LobbyState();
  lobby.add('a', 'Alice');
  lobby.add('b', 'Bob');
  lobby.setReady('a', true, 0);
  lobby.setReady('b', true, 0);
  lobby.step(1800);
  lobby.setReady('a', true, 1801);
  lobby.setReady('b', true, 1801);
  expect(lobby.setLoaded('a', 1801, 1)).toBe(false);
  expect(lobby.setLoaded('a', 1801, 2)).toBe(true);
});

test('loading timeout during a match ends it explicitly; a departed player does not block a loaded survivor', () => {
  const timedOut = playingLobby();
  timedOut.finish(180);
  timedOut.step(300);
  timedOut.setLoaded('a', 300, 2);
  timedOut.step(2100);
  expect(timedOut.phase).toBe('aborted');
  expect(timedOut.setReady('a', true, 2100)).toBe(false);
  const continued = playingLobby();
  continued.finish(180);
  continued.step(300);
  continued.setLoaded('a', 300, 2);
  continued.remove('b', 400);
  expect(continued.snapshot(400).countdownSeconds).toBe(3);
  continued.step(580);
  expect(continued.phase).toBe('playing');
});
