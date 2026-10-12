import type Phaser from 'phaser';
import { PLAYER_HEIGHT, PLAYER_WIDTH } from '@game/core';
import type { PlayerState } from '@game/core';
import goldUrl from './assets/explorer-gold-animations.png';
import blueUrl from './assets/explorer-blue-animations.png';
import goldAtlas from './assets/explorer-gold-animations.json';
import blueAtlas from './assets/explorer-blue-animations.json';

const animations = {
  idle: { frames: ['0', '1'], frameRate: 2, repeat: -1 },
  run: { frames: ['2', '3', '4', '5', '6', '7'], frameRate: 12, repeat: -1 },
  jump: { frames: ['8', '9'], frameRate: 8, repeat: 0 },
  fall: { frames: ['10', '11'], frameRate: 6, repeat: 0 },
};

export function explorerMotion(state: PlayerState): keyof typeof animations {
  if (!state.grounded) return state.velocityY < 0 ? 'jump' : 'fall';
  return state.velocityX === 0 ? 'idle' : 'run';
}

export function preloadExplorerArt(scene: Phaser.Scene) {
  scene.load.atlas('explorer-gold-animated', goldUrl, goldAtlas);
  scene.load.atlas('explorer-blue-animated', blueUrl, blueAtlas);
}

export function createExplorer(scene: Phaser.Scene, color: 'gold' | 'blue') {
  const texture = `explorer-${color}-animated`;
  for (const [motion, { frames, frameRate, repeat }] of Object.entries(
    animations,
  )) {
    const key = `${texture}-${motion}`;
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: frames.map((frame) => ({ key: texture, frame })),
        frameRate,
        repeat,
      });
    }
  }
  return scene.add
    .sprite(0, 0, texture, '0')
    .setOrigin(0)
    .setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT)
    .setDepth(2);
}

export function updateExplorer(
  sprite: Phaser.GameObjects.Sprite,
  state: PlayerState,
) {
  sprite.setPosition(Math.round(state.x), Math.round(state.y));
  sprite.setFlipX(state.facing === -1);
  const key = `${sprite.texture.key}-${explorerMotion(state)}`;
  // Hold the final airborne frame; replay only when the movement state changes.
  if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
}
