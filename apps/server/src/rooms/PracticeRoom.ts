import { Room } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import {
  isReadyMessage,
  isLoadedMessage,
  MAX_PLAYERS,
  parseNickname,
  SNAPSHOT_EVERY_TICKS,
} from '@game/shared';
import { LobbyState } from './LobbyState.js';
import { RoomSimulation } from './RoomSimulation.js';

export class PracticeRoom extends Room {
  maxClients = MAX_PLAYERS;
  maxMessagesPerSecond = 120;
  private readonly simulation = new RoomSimulation();
  private readonly lobby = new LobbyState();
  private lobbyTick = 0;

  onCreate() {
    this.onMessage('input', (client, message: unknown) => {
      if (this.lobby.phase === 'playing')
        this.simulation.receive(client.sessionId, message);
    });
    this.onMessage('stop', (client, message: unknown) => {
      if (this.lobby.phase === 'playing')
        this.simulation.receive(client.sessionId, message, true);
    });
    this.onMessage('ready', (client, message: unknown) => {
      if (
        isReadyMessage(message) &&
        this.lobby.setReady(client.sessionId, message.ready, this.lobbyTick)
      )
        this.publishLobby();
    });
    this.onMessage('loaded', (client, message: unknown) => {
      if (
        isLoadedMessage(message) &&
        message.levelId === this.lobby.level.id &&
        this.lobby.setLoaded(client.sessionId, this.lobbyTick, message.stageId)
      )
        this.publishLobby();
    });
    this.setFixedTimestep(() => {
      this.lobbyTick++;
      if (this.lobby.step(this.lobbyTick)) {
        this.publishLobby();
        if (this.lobby.phase === 'playing') void this.lock();
      }
      this.syncLevel();
      if (this.lobby.phase === 'playing') {
        this.simulation.step();
        if (this.simulation.hasFinished()) {
          this.lobby.finish(this.lobbyTick);
          this.publishLobby();
          this.broadcast('snapshot', this.simulation.snapshot());
        }
      }
      if (this.lobbyTick % SNAPSHOT_EVERY_TICKS === 0) {
        this.publishLobby();
        this.broadcast('snapshot', this.simulation.snapshot());
      }
    }, 60);
  }

  onAuth(_client: Client, options: unknown) {
    if (
      this.lobby.phase !== 'waiting' ||
      !options ||
      typeof options !== 'object' ||
      !parseNickname((options as Record<string, unknown>).nickname)
    )
      throw new Error('Invalid or unavailable lobby');
    return true;
  }

  onJoin(client: Client, options: unknown) {
    if (
      !this.lobby.add(
        client.sessionId,
        (options as Record<string, unknown>).nickname,
      )
    )
      throw new Error('Invalid or unavailable lobby');
    this.simulation.addPlayer(client.sessionId);
    this.publishLobby();
  }
  onLeave(client: Client) {
    if (this.lobby.remove(client.sessionId, this.lobbyTick)) {
      this.simulation.removePlayer(client.sessionId);
      this.publishLobby();
    }
  }

  private syncLevel() {
    if (this.simulation.stageId !== this.lobby.stageId)
      this.simulation.loadLevel(this.lobby.level, this.lobby.stageId);
  }

  private publishLobby() {
    this.syncLevel();
    this.broadcast('lobby', this.lobby.snapshot(this.lobbyTick));
  }
}
