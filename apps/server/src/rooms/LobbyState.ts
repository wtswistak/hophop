import { MAX_PLAYERS, parseNickname } from '@game/shared';
import type { LobbyPhase, LobbyPlayer, LobbySnapshot } from '@game/shared';

const LOAD_TIMEOUT_TICKS = 30 * 60;
const COUNTDOWN_TICKS = 3 * 60;

export class LobbyState {
  phase: LobbyPhase = 'waiting';
  private players = new Map<string, LobbyPlayer>();
  private deadline = 0;

  add(sessionId: string, rawNickname: unknown): boolean {
    const nickname = parseNickname(rawNickname);
    if (
      !nickname ||
      this.phase !== 'waiting' ||
      this.players.size >= MAX_PLAYERS ||
      this.players.has(sessionId)
    )
      return false;
    const slot =
      this.players.size === 0 ||
      ![...this.players.values()].some((player) => player.slot === 1)
        ? 1
        : 2;
    this.players.set(sessionId, {
      sessionId,
      nickname,
      slot,
      ready: false,
      loaded: false,
    });
    return true;
  }

  remove(sessionId: string): boolean {
    if (!this.players.delete(sessionId)) return false;
    if (this.phase !== 'playing') this.reset();
    return true;
  }

  setReady(sessionId: string, ready: boolean, tick: number): boolean {
    const player = this.players.get(sessionId);
    if (!player || this.phase !== 'waiting' || player.ready === ready)
      return false;
    player.ready = ready;
    if (
      this.players.size === MAX_PLAYERS &&
      [...this.players.values()].every((item) => item.ready)
    ) {
      this.phase = 'loading';
      this.deadline = tick + LOAD_TIMEOUT_TICKS;
    }
    return true;
  }

  setLoaded(sessionId: string, tick: number): boolean {
    const player = this.players.get(sessionId);
    if (!player || this.phase !== 'loading' || player.loaded) return false;
    player.loaded = true;
    if (
      this.players.size === MAX_PLAYERS &&
      [...this.players.values()].every((item) => item.loaded)
    ) {
      this.phase = 'countdown';
      this.deadline = tick + COUNTDOWN_TICKS;
    }
    return true;
  }

  step(tick: number): boolean {
    if (this.phase === 'loading' && tick >= this.deadline) {
      this.reset();
      return true;
    }
    if (this.phase === 'countdown') {
      if (tick >= this.deadline) {
        this.phase = 'playing';
        return true;
      }
      return (this.deadline - tick) % 60 === 0;
    }
    return false;
  }

  snapshot(tick: number): LobbySnapshot {
    return {
      phase: this.phase,
      players: [...this.players.values()].map((player) => ({ ...player })),
      countdownSeconds:
        this.phase === 'countdown'
          ? Math.ceil((this.deadline - tick) / 60)
          : null,
    };
  }

  private reset() {
    this.phase = 'waiting';
    this.deadline = 0;
    for (const player of this.players.values()) {
      player.ready = false;
      player.loaded = false;
    }
  }
}
