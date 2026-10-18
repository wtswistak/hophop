import type Phaser from 'phaser';
import { MOB_HEIGHT, MOB_WIDTH } from '@game/core';
import type { MobState } from '@game/core';

// Armored pixel scorpion. Two poses animate the legs without an extra asset.
export function createMobSprites(
  scene: Phaser.Scene,
  mobs: readonly MobState[],
) {
  for (let pose = 0; pose < 2; pose++) {
    const texture = `scorpion-${pose}`;
    if (scene.textures.exists(texture)) continue;
    const art = scene.add.graphics();
    art.fillStyle(0x492d32);
    art.fillRect(10, 15, 26, 15);
    for (const x of [12, 20, 28]) {
      art.fillRect(x, 28, 4, 5 + (pose ? 0 : 3));
      art.fillRect(x - 3, 31, 7, 3);
    }
    // Curled tail and hooked stinger.
    art.fillRect(3, 7, 6, 19);
    art.fillRect(6, 2, 15, 6);
    art.fillRect(17, 6, 5, 8);
    art.fillStyle(0xf2c180);
    art.fillTriangle(17, 12, 23, 12, 21, 19);
    // Oversized split claws at the front.
    art.fillStyle(0x703847);
    art.fillRect(33, 12, 10, 7);
    art.fillRect(33, 25, 10, 7);
    art.fillRect(40, 8, 8, 7);
    art.fillRect(40, 29, 8, 7);
    art.fillStyle(0xd7986a);
    art.fillRect(44, 15, 4, 4);
    art.fillRect(44, 25, 4, 4);
    // Segmented shell and pale spikes.
    art.fillStyle(0x98524c);
    for (const x of [12, 20, 28]) art.fillRect(x, 17, 5, 10);
    art.fillStyle(0xf2c180);
    for (const x of [12, 20, 28]) art.fillTriangle(x, 16, x + 5, 16, x + 2, 10);
    art.fillStyle(0xff5148);
    art.fillRect(31, 18, 4, 3);
    art.fillRect(31, 24, 4, 3);
    art.generateTexture(texture, MOB_WIDTH, MOB_HEIGHT);
    art.destroy();
  }
  return new Map(
    mobs.map((mob) => [
      mob.id,
      scene.add.sprite(mob.x, mob.y, 'scorpion-0').setOrigin(0).setDepth(2),
    ]),
  );
}

export function updateMobSprites(
  sprites: Map<string, Phaser.GameObjects.Sprite>,
  mobs: readonly MobState[],
  time: number,
) {
  for (const mob of mobs) {
    const pose = Math.floor(time / (mob.alert ? 80 : 160)) % 2;
    sprites
      .get(mob.id)
      ?.setTexture(`scorpion-${pose}`)
      .setPosition(Math.round(mob.x), Math.round(mob.y))
      .setFlipX(mob.direction === -1)
      .setTint(mob.alert ? 0xffa18c : 0xffffff);
  }
}
