import Phaser from 'phaser';
import { createPlayer, FIXED_STEP_MS, stepPlayer } from '@game/core';
import type { PlayerState } from '@game/core';
import { practiceLevel } from './level';
import type { PlayerControls } from './PlayerControls';
import type { MultiplayerSession } from '../network/MultiplayerSession';
import { createCanyonWorld, preloadCanyonArt } from './CanyonArt';
import { createExplorer, updateExplorer } from './ExplorerSprite';

class PracticeScene extends Phaser.Scene {
  private player: PlayerState = createPlayer(practiceLevel);
  private sprite?: Phaser.GameObjects.Sprite;
  private readonly remoteSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private accumulator = 0;
  private paused = false;

  constructor(
    private readonly controls: PlayerControls,
    private readonly session?: MultiplayerSession,
  ) {
    super('practice');
  }

  preload() {
    preloadCanyonArt(this);
  }

  create() {
    this.player = this.session?.player ?? createPlayer(practiceLevel);
    createCanyonWorld(this, practiceLevel);
    this.sprite = createExplorer(this, 'gold');
    updateExplorer(this.sprite, this.player);
    this.cameras.main.setBounds(0, 0, practiceLevel.width, 540);
    this.cameras.main.startFollow(this.sprite, true, 1, 1);

    const pause = () => {
      this.paused = true;
      this.anims.pauseAll();
      this.session?.stop();
      this.accumulator = 0;
      this.controls.reset();
    };
    const resume = () => {
      this.paused = document.hidden;
      if (!this.paused) this.anims.resumeAll();
      this.accumulator = 0;
      this.controls.reset();
    };
    const visibility = () => {
      if (document.hidden) pause();
      else resume();
    };
    window.addEventListener('blur', pause);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', visibility);
    const cleanup = () => {
      window.removeEventListener('blur', pause);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', visibility);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  update(_time: number, delta: number) {
    if (this.paused && !this.session) return;
    // At most six ticks after a stall; returning to a tab never fast-forwards the game.
    if (!this.paused) this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= FIXED_STEP_MS) {
      const input = this.controls.read();
      if (this.session) this.session.advance(input);
      else this.player = stepPlayer(this.player, input, practiceLevel);
      this.accumulator -= FIXED_STEP_MS;
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
    if (this.sprite) updateExplorer(this.sprite, this.player);
  }
}

export function createGame(
  parent: HTMLElement,
  controls: PlayerControls,
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
    scene: new PracticeScene(controls, session),
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
  });
}
