import Phaser from 'phaser';
import { PLAYER_HEIGHT, PLAYER_WIDTH } from '@game/core';
import type { LevelGeometry, PlayerState } from '@game/core';
import backgroundUrl from './assets/canyon-background.png';
import sandstoneUrl from './assets/sandstone-tile.png';
import goldUrl from './assets/explorer-gold.png';
import blueUrl from './assets/explorer-blue.png';

export function preloadCanyonArt(scene: Phaser.Scene) {
  scene.load.image('canyon', backgroundUrl);
  scene.load.image('sandstone', sandstoneUrl);
  scene.load.image('explorer-gold', goldUrl);
  scene.load.image('explorer-blue', blueUrl);
}

export function createCanyonWorld(scene: Phaser.Scene, level: LevelGeometry) {
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
    .text(24, 20, 'TRENING', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fff3da',
      backgroundColor: '#273746',
      padding: { x: 12, y: 8 },
    })
    .setScrollFactor(0)
    .setDepth(10);
  scene.add.text(2910, 310, 'Koniec planszy\nWróć lub skacz dalej!', {
    fontFamily: 'monospace',
    fontSize: '18px',
    color: '#fff3da',
    backgroundColor: '#273746',
    padding: { x: 8, y: 6 },
  });
}

export function createExplorer(scene: Phaser.Scene, color: 'gold' | 'blue') {
  const texture = scene.textures.get(`explorer-${color}`);
  if (!texture.has('body')) {
    // Trim the generated canvas padding so the visible body follows the hitbox.
    const [x, y, width, height] =
      color === 'gold'
        ? ([266, 114, 774, 1061] as const)
        : ([265, 113, 776, 1063] as const);
    texture.add('body', 0, x, y, width, height);
  }
  return scene.add
    .image(0, 0, `explorer-${color}`, 'body')
    .setOrigin(0)
    .setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT)
    .setDepth(2);
}

export function updateExplorer(
  sprite: Phaser.GameObjects.Image,
  state: PlayerState,
) {
  sprite.setPosition(Math.round(state.x), Math.round(state.y));
  sprite.setFlipX(state.facing === -1);
}
