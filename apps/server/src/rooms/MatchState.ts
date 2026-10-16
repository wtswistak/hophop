import { levels } from '@game/core';
import { MAX_PLAYERS, parseNickname } from '@game/shared';
import type { LobbyPhase, LobbyPlayer, LobbySnapshot } from '@game/shared';

const LOAD_TIMEOUT_TICKS = 30 * 60;
const COUNTDOWN_TICKS = 3 * 60;

export class MatchState {
  phase: LobbyPhase = 'waiting';
  private players = new Map<string, LobbyPlayer>();
  private deadline = 0;
  private started = false;
  private levelIndex = 0;
  stageId = 1;

  get level() {
    return levels[this.levelIndex]!;
  }

  finish(tick: number): boolean {
    if (this.phase !== 'playing') return false;
    this.phase = 'transition';
    this.deadline = tick + 2 * 60;
    return true;
  }

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

  remove(sessionId: string, tick = 0): boolean {
    if (!this.players.delete(sessionId)) return false;
    if (!this.started) this.reset();
    else if (this.phase === 'loading') this.beginCountdownIfLoaded(tick);
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

  setLoaded(sessionId: string, tick: number, stageId: number): boolean {
    const player = this.players.get(sessionId);
    if (
      !player ||
      this.phase !== 'loading' ||
      player.loaded ||
      stageId !== this.stageId
    )
      return false;
    player.loaded = true;
    this.beginCountdownIfLoaded(tick);
    return true;
  }

  private beginCountdownIfLoaded(tick: number) {
    if (
      this.players.size > 0 &&
      [...this.players.values()].every((item) => item.loaded)
    ) {
      this.phase = 'countdown';
      this.deadline = tick + COUNTDOWN_TICKS;
    }
  }

  step(tick: number): boolean {
    if (this.phase === 'loading' && tick >= this.deadline) {
      if (this.started) this.phase = 'aborted';
      else this.reset();
      return true;
    }
    if (this.phase === 'transition' && tick >= this.deadline) {
      if (this.levelIndex === levels.length - 1) this.phase = 'finished';
      else {
        this.levelIndex++;
        this.stageId++;
        this.phase = 'loading';
        this.deadline = tick + LOAD_TIMEOUT_TICKS;
        for (const player of this.players.values()) player.loaded = false;
      }
      return true;
    }
    if (this.phase === 'countdown') {
      if (tick >= this.deadline) {
        this.phase = 'playing';
        this.started = true;
        return true;
      }
      return (this.deadline - tick) % 60 === 0;
    }
    return false;
  }

  snapshot(tick: number): LobbySnapshot {
    return {
      phase: this.phase,
      stageId: this.stageId,
      levelId: this.level.id,
      players: [...this.players.values()].map((player) => ({ ...player })),
      countdownSeconds:
        this.phase === 'countdown'
          ? Math.ceil((this.deadline - tick) / 60)
          : null,
    };
  }

  private reset() {
    this.phase = 'waiting';
    this.stageId++;
    this.deadline = 0;
    for (const player of this.players.values()) {
      player.ready = false;
      player.loaded = false;
    }
  }
}
