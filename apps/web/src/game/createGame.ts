import Phaser from 'phaser';
import {
  createPlayer,
  FIXED_STEP_MS,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  stepPlayer,
} from '@game/core';
import type { PlayerState } from '@game/core';
import { practiceLevel } from './level';
import type { PlayerControls } from './PlayerControls';
import type { MultiplayerSession } from '../network/MultiplayerSession';

class PracticeScene extends Phaser.Scene {
  private player: PlayerState = createPlayer(practiceLevel);
  private sprite?: Phaser.GameObjects.Rectangle;
  private readonly remoteSprites = new Map<
    string,
    Phaser.GameObjects.Rectangle
  >();
  private accumulator = 0;
  private paused = false;

  constructor(
    private readonly controls: PlayerControls,
    private readonly session?: MultiplayerSession,
  ) {
    super('practice');
  }

  create() {
    this.player = this.session?.player ?? createPlayer(practiceLevel);
    for (let x = 100; x < practiceLevel.width; x += 260) {
      this.add.rectangle(x, 170, 100, 26, 0x26495b);
    }
    for (const platform of practiceLevel.platforms) {
      this.add
        .rectangle(
          platform.x,
          platform.y,
          platform.width,
          platform.height,
          0x385b48,
        )
        .setOrigin(0);
      this.add
        .rectangle(platform.x, platform.y, platform.width, 6, 0x80b88c)
        .setOrigin(0);
    }
    this.add.text(70, 360, 'START', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#b8dbc8',
    });
    this.add.text(2910, 310, 'Koniec planszy\nWróć lub skacz dalej!', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#b8dbc8',
    });
    this.sprite = this.add
      .rectangle(
        this.player.x,
        this.player.y,
        PLAYER_WIDTH,
        PLAYER_HEIGHT,
        0xf4bf60,
      )
      .setOrigin(0);
    this.cameras.main.setBounds(0, 0, practiceLevel.width, 540);
    this.cameras.main.startFollow(this.sprite, true, 1, 1);

    const pause = () => {
      this.paused = true;
      this.session?.stop();
      this.accumulator = 0;
      this.controls.reset();
    };
    const resume = () => {
      this.paused = document.hidden;
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
          sprite = this.add
            .rectangle(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT, 0x79c9f1)
            .setOrigin(0);
          this.remoteSprites.set(remote.sessionId, sprite);
        }
        sprite.setPosition(remote.state.x, remote.state.y);
      }
    }
    this.sprite?.setPosition(this.player.x, this.player.y);
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
    backgroundColor: '#162c3b',
    scene: new PracticeScene(controls, session),
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
  });
}
