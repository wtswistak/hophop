import {
  createPlayer,
  FIXED_STEP_MS,
  practiceLevel,
  stepPlayer,
} from '@game/core';
import type { PlayerInput, PlayerState } from '@game/core';
import { isGameSnapshot, LEVEL_ID, MAX_PENDING_INPUTS } from '@game/shared';
import type { GameSnapshot, InputCommand } from '@game/shared';

type SendCommand = (type: 'input' | 'stop', command: InputCommand) => void;
interface ReceivedSnapshot {
  snapshot: GameSnapshot;
  receivedAt: number;
}
export interface SessionStatus {
  connected: boolean;
  playerCount: number;
}

export class MultiplayerSession {
  player = createPlayer(practiceLevel);
  private pending: InputCommand[] = [];
  private sequence = 0;
  private lastTick = -1;
  private history: ReceivedSnapshot[] = [];
  private status: SessionStatus = { connected: true, playerCount: 0 };
  private readonly listeners = new Set<() => void>();
  private closed = false;

  constructor(
    readonly roomId: string,
    readonly sessionId: string,
    private readonly send: SendCommand,
    private readonly leave: () => void,
  ) {}

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  readonly getStatus = () => this.status;

  receive(message: unknown, now: number): boolean {
    if (
      this.closed ||
      !isGameSnapshot(message) ||
      message.tick <= this.lastTick
    )
      return false;
    const own = message.players.find(
      (player) => player.sessionId === this.sessionId,
    );
    if (!own || own.lastProcessedSequence > this.sequence) return false;
    this.lastTick = message.tick;
    this.pending = this.pending.filter(
      (command) => command.sequence > own.lastProcessedSequence,
    );
    this.player = { ...own.state };
    for (const command of this.pending)
      this.player = stepPlayer(this.player, command, practiceLevel);
    this.history.push({ snapshot: message, receivedAt: now });
    if (this.history.length > 12) this.history.shift();
    if (this.status.playerCount !== message.players.length) {
      this.status = { ...this.status, playerCount: message.players.length };
      this.listeners.forEach((listener) => listener());
    }
    return true;
  }

  advance(input: PlayerInput) {
    if (
      this.closed ||
      this.lastTick < 0 ||
      this.pending.length >= MAX_PENDING_INPUTS
    )
      return;
    const command: InputCommand = {
      ...input,
      sequence: ++this.sequence,
      levelId: LEVEL_ID,
    };
    this.pending.push(command);
    this.player = stepPlayer(this.player, command, practiceLevel);
    this.send('input', command);
  }

  stop() {
    if (this.closed) return;
    this.pending = [];
    this.send('stop', {
      direction: 0,
      jump: false,
      sequence: ++this.sequence,
      levelId: LEVEL_ID,
    });
  }

  remotePlayers(now: number): { sessionId: string; state: PlayerState }[] {
    const latest = this.history.at(-1);
    if (!latest) return [];
    // Render remote entities 100 ms behind the latest estimate; never extrapolate a fall.
    const renderTick =
      latest.snapshot.tick + (now - latest.receivedAt - 100) / FIXED_STEP_MS;
    const before =
      [...this.history]
        .reverse()
        .find((item) => item.snapshot.tick <= renderTick) ?? this.history[0]!;
    const after =
      this.history.find((item) => item.snapshot.tick >= renderTick) ?? latest;
    const span = after.snapshot.tick - before.snapshot.tick;
    const alpha =
      span > 0
        ? Math.max(0, Math.min(1, (renderTick - before.snapshot.tick) / span))
        : 1;
    return latest.snapshot.players
      .filter((player) => player.sessionId !== this.sessionId)
      .map((player) => {
        const from = before.snapshot.players.find(
          (item) => item.sessionId === player.sessionId,
        )?.state;
        const to = after.snapshot.players.find(
          (item) => item.sessionId === player.sessionId,
        )?.state;
        if (!from || !to || Math.hypot(to.x - from.x, to.y - from.y) > 128) {
          return { sessionId: player.sessionId, state: { ...player.state } };
        }
        return {
          sessionId: player.sessionId,
          state: {
            ...to,
            x: from.x + (to.x - from.x) * alpha,
            y: from.y + (to.y - from.y) * alpha,
          },
        };
      });
  }

  disconnected() {
    if (this.closed) return;
    this.closed = true;
    this.pending = [];
    this.status = { ...this.status, connected: false };
    this.listeners.forEach((listener) => listener());
  }

  close() {
    if (!this.closed) this.disconnected();
    this.leave();
  }
}
