import type Phaser from 'phaser';
import { MOB_HEIGHT, MOB_WIDTH } from '@game/core';
import type { MobState } from '@game/core';

// Pixel scorpion drawn locally; no additional asset download or dependency.
export function createMobSprites(
  scene: Phaser.Scene,
  mobs: readonly MobState[],
) {
  const texture = 'scorpion';
  if (!scene.textures.exists(texture)) {
    const art = scene.add.graphics();
    art.fillStyle(0x542c27);
    art.fillRect(6, 12, 24, 12);
    for (const x of [8, 16, 24]) art.fillRect(x, 23, 4, 5);
    art.fillRect(0, 2, 5, 16);
    art.fillRect(3, 0, 9, 5);
    art.fillRect(29, 10, 7, 5);
    art.fillRect(29, 20, 7, 5);
    art.fillStyle(0xb55337);
    art.fillRect(8, 13, 20, 8);
    art.fillStyle(0xffdd73);
    art.fillRect(25, 13, 3, 3);
    art.generateTexture(texture, MOB_WIDTH, MOB_HEIGHT);
    art.destroy();
  }
  return new Map(
    mobs.map((mob) => [
      mob.id,
      scene.add.sprite(mob.x, mob.y, texture).setOrigin(0).setDepth(2),
    ]),
  );
}

export function updateMobSprites(
  sprites: Map<string, Phaser.GameObjects.Sprite>,
  mobs: readonly MobState[],
) {
  for (const mob of mobs) {
    sprites
      .get(mob.id)
      ?.setPosition(Math.round(mob.x), Math.round(mob.y))
      .setFlipX(mob.direction === -1);
  }
}
