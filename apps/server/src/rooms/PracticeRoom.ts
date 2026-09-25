import { Room } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import { MAX_PLAYERS, SNAPSHOT_EVERY_TICKS } from '@game/shared';
import { RoomSimulation } from './RoomSimulation.js';

export class PracticeRoom extends Room {
  maxClients = MAX_PLAYERS;
  maxMessagesPerSecond = 120;
  private readonly simulation = new RoomSimulation();

  onCreate() {
    this.onMessage('input', (client, message: unknown) => {
      this.simulation.receive(client.sessionId, message);
    });
    this.onMessage('stop', (client, message: unknown) => {
      this.simulation.receive(client.sessionId, message, true);
    });
    this.setFixedTimestep(() => {
      this.simulation.step();
      if (this.simulation.tick % SNAPSHOT_EVERY_TICKS === 0) {
        this.broadcast('snapshot', this.simulation.snapshot());
      }
    }, 60);
  }

  onJoin(client: Client) {
    this.simulation.addPlayer(client.sessionId);
  }
  onLeave(client: Client) {
    this.simulation.removePlayer(client.sessionId);
  }
}
