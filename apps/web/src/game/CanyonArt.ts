import type Phaser from 'phaser';
import type { LevelDefinition } from '@game/core';
import backgroundUrl from './assets/canyon-background.png';
import sandstoneUrl from './assets/sandstone-tile.png';
import { preloadExplorerArt } from './ExplorerSprite';

export function preloadCanyonArt(scene: Phaser.Scene) {
  scene.load.image('canyon', backgroundUrl);
  scene.load.image('sandstone', sandstoneUrl);
  preloadExplorerArt(scene);
}

export function createCanyonWorld(scene: Phaser.Scene, level: LevelDefinition) {
  scene.add
    .image(0, 0, 'canyon')
    .setOrigin(0)
    .setDisplaySize(960, 540)
    .setScrollFactor(0);

  const texture = scene.textures.get('sandstone');
  const { width, height } = texture.getSourceImage();
  const lipHeight = Math.round(height * 0.1);
  texture.add('lip', 0, 0, 0, width, lipHeight);
  texture.add('rock', 0, 0, lipHeight, width, height - lipHeight);
  for (const platform of level.platforms) {
    scene.add
      .tileSprite(
        platform.x,
        platform.y + 6,
        platform.width,
        platform.height - 6,
        'sandstone',
        'rock',
      )
      .setOrigin(0)
      .setTileScale(64 / width, 64 / (height - lipHeight));
    scene.add
      .tileSprite(platform.x, platform.y, platform.width, 6, 'sandstone', 'lip')
      .setOrigin(0)
      .setTileScale(64 / width, 6 / lipHeight);
  }
  scene.add
    .text(24, 20, level.name, {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fff3da',
      backgroundColor: '#273746',
      padding: { x: 12, y: 8 },
    })
    .setScrollFactor(0)
    .setDepth(10);
  const { x, y, height: finishHeight } = level.finish;
  scene.add.rectangle(x, y, 6, finishHeight, 0xfff3da).setOrigin(0);
  scene.add.rectangle(x + 6, y, 58, 36, 0xedb66c).setOrigin(0);
  scene.add.text(x + 10, y + 10, 'META', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#273746',
  });
}
