import {
  createPlayer,
  FIXED_STEP_MS,
  levels,
  getLevel,
  stepPlayer,
} from '@game/core';
import type { MobState, PlayerInput, PlayerState } from '@game/core';
import {
  isGameSnapshot,
  isLobbySnapshot,
  MAX_PENDING_INPUTS,
} from '@game/shared';
import type {
  GameSnapshot,
  InputCommand,
  LobbySnapshot,
  StageIdentity,
} from '@game/shared';

type SendCommand = (type: 'input' | 'stop', command: InputCommand) => void;
interface ReceivedSnapshot {
  snapshot: GameSnapshot;
  receivedAt: number;
}
export interface SessionStatus {
  connected: boolean;
  playerCount: number;
  lobby: LobbySnapshot;
}

export class MultiplayerSession {
  player = createPlayer(levels[0]!);
  private pending: InputCommand[] = [];
  private sequence = 0;
  private lastTick = -1;
  private history: ReceivedSnapshot[] = [];
  private status: SessionStatus = {
    connected: true,
    playerCount: 0,
    lobby: {
      phase: 'waiting',
      players: [],
      countdownSeconds: null,
      levelId: levels[0]!.id,
      stageId: 1,
    },
  };
  private readonly listeners = new Set<() => void>();
  private closed = false;

  constructor(
    readonly roomId: string,
    readonly sessionId: string,
    private readonly send: SendCommand,
    private readonly leave: () => void,
    private readonly sendControl: (
      type: 'ready' | 'loaded',
      message: { ready: boolean } | StageIdentity,
    ) => void = () => {},
  ) {}

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  readonly getStatus = () => this.status;

  receiveLobby(message: unknown): boolean {
    if (this.closed || !isLobbySnapshot(message)) return false;
    if (message.stageId < this.status.lobby.stageId) return false;
    if (
      message.stageId === this.status.lobby.stageId &&
      message.levelId !== this.status.lobby.levelId
    )
      return false;
    if (message.stageId !== this.status.lobby.stageId) {
      this.pending = [];
      this.history = [];
      this.sequence = 0;
      this.lastTick = -1;
      this.player = createPlayer(getLevel(message.levelId)!);
    }
    if (message.phase !== 'playing') this.pending = [];
    if (JSON.stringify(this.status.lobby) === JSON.stringify(message))
      return true;
    this.status = {
      ...this.status,
      lobby: message,
      playerCount: message.players.length,
    };
    this.listeners.forEach((listener) => listener());
    return true;
  }

  setReady(ready: boolean) {
    if (this.closed || this.status.lobby.phase !== 'waiting') return;
    this.sendControl('ready', { ready });
  }

  loaded(stageId: number) {
    if (
      this.closed ||
      this.status.lobby.phase !== 'loading' ||
      stageId !== this.status.lobby.stageId
    )
      return;
    this.sendControl('loaded', { stageId, levelId: this.status.lobby.levelId });
  }

  receive(message: unknown, now: number): boolean {
    if (
      this.closed ||
      !isGameSnapshot(message) ||
      message.stageId !== this.status.lobby.stageId ||
      message.levelId !== this.status.lobby.levelId ||
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
      this.player = stepPlayer(
        this.player,
        command,
        getLevel(this.status.lobby.levelId)!,
      );
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
      this.status.lobby.phase !== 'playing' ||
      this.pending.length >= MAX_PENDING_INPUTS
    )
      return;
    const command: InputCommand = {
      ...input,
      sequence: ++this.sequence,
      levelId: this.status.lobby.levelId,
      stageId: this.status.lobby.stageId,
    };
    this.pending.push(command);
    this.player = stepPlayer(
      this.player,
      command,
      getLevel(this.status.lobby.levelId)!,
    );
    this.send('input', command);
  }

  stop() {
    if (this.closed || this.status.lobby.phase !== 'playing') return;
    this.pending = [];
    this.send('stop', {
      direction: 0,
      jump: false,
      sequence: ++this.sequence,
      levelId: this.status.lobby.levelId,
      stageId: this.status.lobby.stageId,
    });
  }

  remotePlayers(now: number): { sessionId: string; state: PlayerState }[] {
    const latest = this.history.at(-1);
    if (!latest) return [];
    const { before, after, alpha } = this.interpolationWindow(now, latest);
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

  remoteMobs(now: number): MobState[] {
    const latest = this.history.at(-1);
    if (!latest) return [];
    const { before, after, alpha } = this.interpolationWindow(now, latest);
    return latest.snapshot.mobs.map((mob) => {
      const from =
        before.snapshot.mobs.find((item) => item.id === mob.id) ?? mob;
      const to = after.snapshot.mobs.find((item) => item.id === mob.id) ?? mob;
      return {
        ...to,
        x: from.x + (to.x - from.x) * alpha,
        y: from.y + (to.y - from.y) * alpha,
      };
    });
  }

  private interpolationWindow(now: number, latest: ReceivedSnapshot) {
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
    return { before, after, alpha };
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
