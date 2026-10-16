import { Room } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import {
  isReadyMessage,
  isLoadedMessage,
  MAX_PLAYERS,
  parseNickname,
  SNAPSHOT_EVERY_TICKS,
} from '@game/shared';
import { MatchState } from './MatchState.js';
import { RoomSimulation } from './RoomSimulation.js';

export class GameRoom extends Room {
  maxClients = MAX_PLAYERS;
  maxMessagesPerSecond = 120;
  private readonly simulation = new RoomSimulation();
  private readonly match = new MatchState();
  private matchTick = 0;

  onCreate() {
    this.onMessage('input', (client, message: unknown) => {
      if (this.match.phase === 'playing')
        this.simulation.receive(client.sessionId, message);
    });
    this.onMessage('stop', (client, message: unknown) => {
      if (this.match.phase === 'playing')
        this.simulation.receive(client.sessionId, message, true);
    });
    this.onMessage('ready', (client, message: unknown) => {
      if (
        isReadyMessage(message) &&
        this.match.setReady(client.sessionId, message.ready, this.matchTick)
      )
        this.publishLobby();
    });
    this.onMessage('loaded', (client, message: unknown) => {
      if (
        isLoadedMessage(message) &&
        message.levelId === this.match.level.id &&
        this.match.setLoaded(client.sessionId, this.matchTick, message.stageId)
      )
        this.publishLobby();
    });
    this.setFixedTimestep(() => {
      this.matchTick++;
      if (this.match.step(this.matchTick)) {
        this.syncLevel();
        this.publishLobby();
        if (this.match.phase === 'playing') void this.lock();
      }
      if (this.match.phase === 'playing') {
        this.simulation.step();
        if (this.simulation.hasFinished()) {
          this.match.finish(this.matchTick);
          this.publishLobby();
          this.broadcast('snapshot', this.simulation.snapshot());
        }
      }
      if (this.matchTick % SNAPSHOT_EVERY_TICKS === 0) {
        this.publishLobby();
        this.broadcast('snapshot', this.simulation.snapshot());
      }
    }, 60);
  }

  onAuth(_client: Client, options: unknown) {
    if (
      this.match.phase !== 'waiting' ||
      !options ||
      typeof options !== 'object' ||
      !parseNickname((options as Record<string, unknown>).nickname)
    )
      throw new Error('Invalid or unavailable lobby');
    return true;
  }

  onJoin(client: Client, options: unknown) {
    if (
      !this.match.add(
        client.sessionId,
        (options as Record<string, unknown>).nickname,
      )
    )
      throw new Error('Invalid or unavailable lobby');
    this.simulation.addPlayer(client.sessionId);
    this.publishLobby();
  }
  onLeave(client: Client) {
    if (this.match.remove(client.sessionId, this.matchTick)) {
      this.simulation.removePlayer(client.sessionId);
      this.syncLevel();
      this.publishLobby();
    }
  }

  private syncLevel() {
    if (this.simulation.stageId !== this.match.stageId)
      this.simulation.loadLevel(this.match.level, this.match.stageId);
  }

  private publishLobby() {
    this.broadcast('lobby', this.match.snapshot(this.matchTick));
  }
}
