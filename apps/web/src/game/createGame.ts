import Phaser from 'phaser';
class PreviewScene extends Phaser.Scene {
  create() {
    this.add.rectangle(480, 500, 960, 80, 0x385b48);
    this.add.rectangle(180, 428, 40, 64, 0xf4bf60);
    this.add.rectangle(520, 340, 180, 24, 0x638a72);
  }
}
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: '#162c3b',
    scene: PreviewScene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
  });
}
