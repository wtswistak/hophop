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

class PracticeScene extends Phaser.Scene {
  private player: PlayerState = createPlayer(practiceLevel);
  private sprite?: Phaser.GameObjects.Rectangle;
  private accumulator = 0;
  private paused = false;

  constructor(private readonly controls: PlayerControls) {
    super('practice');
  }

  create() {
    this.player = createPlayer(practiceLevel);
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
    if (this.paused) return;
    // At most six ticks after a stall; returning to a tab never fast-forwards the game.
    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= FIXED_STEP_MS) {
      this.player = stepPlayer(
        this.player,
        this.controls.read(),
        practiceLevel,
      );
      this.accumulator -= FIXED_STEP_MS;
    }
    this.sprite?.setPosition(this.player.x, this.player.y);
  }
}

export function createGame(
  parent: HTMLElement,
  controls: PlayerControls,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: '#162c3b',
    scene: new PracticeScene(controls),
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
  });
}
