import Phaser from 'phaser';
import {
  createPlayer,
  FIXED_STEP_MS,
  createMobs,
  SingleplayerSimulation,
} from '@game/core';
import type { LevelDefinition, PlayerState } from '@game/core';
import type { PlayerControls } from './PlayerControls';
import type { MultiplayerSession } from '../network/MultiplayerSession';
import { createCanyonWorld, preloadCanyonArt } from './CanyonArt';
import { createMobSprites, updateMobSprites } from './MobSprites';
import { createExplorer, updateExplorer } from './ExplorerSprite';

class PlatformScene extends Phaser.Scene {
  private player: PlayerState;
  private readonly local: SingleplayerSimulation | undefined;
  private mobSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private loadFailed = false;
  private sprite?: Phaser.GameObjects.Sprite;
  private readonly remoteSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private accumulator = 0;
  private animationsPaused = false;
  private mobAnimationTime = 0;

  constructor(
    private readonly controls: PlayerControls,
    private readonly level: LevelDefinition,
    private readonly lifecycle: GameLifecycle,
    private readonly session?: MultiplayerSession,
  ) {
    super('platform');
    this.player = createPlayer(level);
    this.local = session ? undefined : new SingleplayerSimulation(level);
  }

  preload() {
    this.load.once('loaderror', () => {
      this.loadFailed = true;
      this.lifecycle.onLoadError();
    });
    preloadCanyonArt(this);
  }

  create() {
    if (this.loadFailed) return;
    this.player = this.session?.player ?? createPlayer(this.level);
    const background = createCanyonWorld(this, this.level);
    this.mobSprites = createMobSprites(this, createMobs(this.level));
    this.sprite = createExplorer(this, 'gold');
    updateExplorer(this.sprite, this.player);
    this.cameras.main.setBounds(0, 0, this.level.width, 540);
    this.cameras.main.startFollow(this.sprite, true, 1, 1);

    const resize = () => {
      const { width, height } = this.scale.gameSize;
      // Keep upcoming landings visible even on a portrait phone.
      const zoom = Math.min(height / 540, width / 640);
      this.cameras.main.setZoom(zoom);
      background
        .setPosition(width / 2, height / 2)
        .setDisplaySize(width / zoom, height / zoom);
    };
    resize();
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);
    this.lifecycle.onReady();

    const cleanup = () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, resize);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  update(_time: number, delta: number) {
    if (this.loadFailed) return;
    if (!this.lifecycle.canPlay()) {
      this.accumulator = 0;
      this.controls.reset();
    }
    const animate = this.session
      ? this.session.getStatus().connected &&
        this.session.getStatus().lobby.phase === 'playing'
      : this.lifecycle.canPlay();
    if (animate) this.mobAnimationTime += Math.min(delta, 100);
    const pauseAnimations = !animate;
    if (this.animationsPaused !== pauseAnimations) {
      this.animationsPaused = pauseAnimations;
      if (animate) this.anims.resumeAll();
      else this.anims.pauseAll();
    }
    // At most six ticks after a stall; returning to a tab never fast-forwards the game.
    if (this.lifecycle.canPlay() && !this.local?.finished)
      this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= FIXED_STEP_MS) {
      const input = this.controls.read();
      if (this.session) this.session.advance(input);
      else if (this.local) {
        this.local.step(input);
        this.player = this.local.player;
      }
      this.accumulator -= FIXED_STEP_MS;
      if (this.local?.finished) {
        this.accumulator = 0;
        this.lifecycle.onFinish();
      }
    }
    if (this.session) {
      this.player = this.session.player;
      const remotes = this.session.remotePlayers(performance.now());
      for (const [id, sprite] of this.remoteSprites) {
        if (!remotes.some((remote) => remote.sessionId === id)) {
          sprite.destroy();
          this.remoteSprites.delete(id);
        }
      }
      for (const remote of remotes) {
        let sprite = this.remoteSprites.get(remote.sessionId);
        if (!sprite) {
          sprite = createExplorer(this, 'blue');
          this.remoteSprites.set(remote.sessionId, sprite);
        }
        updateExplorer(sprite, remote.state);
      }
    }
    updateMobSprites(
      this.mobSprites,
      this.session
        ? this.session.remoteMobs(performance.now())
        : this.local!.mobs,
      this.mobAnimationTime,
    );
    if (this.sprite) updateExplorer(this.sprite, this.player);
  }
}

export interface GameLifecycle {
  canPlay: () => boolean;
  onReady: () => void;
  onFinish: () => void;
  onLoadError: () => void;
}

export function createGame(
  parent: HTMLElement,
  controls: PlayerControls,
  level: LevelDefinition,
  lifecycle: GameLifecycle,
  session?: MultiplayerSession,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: '#a2d6de',
    pixelArt: true,
    roundPixels: true,
    scene: new PlatformScene(controls, level, lifecycle, session),
    scale: { mode: Phaser.Scale.RESIZE },
    audio: { noAudio: true },
  });
}
