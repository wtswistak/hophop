import { createPlayer, practiceLevel, stepPlayer } from '@game/core';
import type { PlayerInput, PlayerState } from '@game/core';
import {
  isInputCommand,
  LEVEL_ID,
  MAX_PLAYERS,
  MAX_PENDING_INPUTS,
} from '@game/shared';
import type { GameSnapshot, InputCommand } from '@game/shared';

interface Participant {
  state: PlayerState;
  queue: InputCommand[];
  lastReceived: number;
  lastProcessed: number;
  lastInputTick: number;
  direction: PlayerInput['direction'];
  messages: number;
  windowStart: number;
}

const MAX_QUEUE = 12;
const INPUT_TIMEOUT_TICKS = 15;
const MAX_MESSAGES_PER_SECOND = 120;

export class RoomSimulation {
  tick = 0;
  private readonly players = new Map<string, Participant>();

  addPlayer(sessionId: string) {
    if (this.players.size >= MAX_PLAYERS || this.players.has(sessionId))
      throw new Error('Room is full');
    const state = createPlayer(practiceLevel);
    // Separate starting positions; player bodies do not collide with each other.
    if ([...this.players.values()].some((player) => player.state.x === state.x))
      state.x += 64;
    this.players.set(sessionId, {
      state,
      queue: [],
      lastReceived: 0,
      lastProcessed: 0,
      lastInputTick: this.tick,
      direction: 0,
      messages: 0,
      windowStart: this.tick,
    });
  }

  removePlayer(sessionId: string) {
    this.players.delete(sessionId);
  }

  receive(sessionId: string, message: unknown, stop = false): boolean {
    const player = this.players.get(sessionId);
    if (!player) return false;
    if (this.tick - player.windowStart >= 60) {
      player.messages = 0;
      player.windowStart = this.tick;
    }
    if (++player.messages > MAX_MESSAGES_PER_SECOND || !isInputCommand(message))
      return false;
    if (
      message.sequence <= player.lastReceived ||
      message.sequence > player.lastReceived + MAX_PENDING_INPUTS
    )
      return false;
    if (stop && (message.direction !== 0 || message.jump)) return false;
    player.lastReceived = message.sequence;
    if (stop) {
      player.queue = [];
      player.direction = 0;
      player.lastProcessed = message.sequence;
      player.lastInputTick = this.tick;
      return true;
    }
    if (player.queue.length >= MAX_QUEUE) return false;
    player.queue.push(message);
    player.lastInputTick = this.tick;
    return true;
  }

  step() {
    this.tick++;
    for (const player of this.players.values()) {
      const command = player.queue.shift();
      if (command) {
        player.lastProcessed = command.sequence;
        player.direction = command.direction;
      }
      if (this.tick - player.lastInputTick > INPUT_TIMEOUT_TICKS)
        player.direction = 0;
      player.state = stepPlayer(
        player.state,
        { direction: player.direction, jump: command?.jump ?? false },
        practiceLevel,
      );
    }
  }

  snapshot(): GameSnapshot {
    return {
      tick: this.tick,
      levelId: LEVEL_ID,
      players: [...this.players].map(([sessionId, player]) => ({
        sessionId,
        state: { ...player.state },
        lastProcessedSequence: player.lastProcessed,
      })),
    };
  }
}
