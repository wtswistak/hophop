import { expect, test, vi } from 'vitest';
import type Phaser from 'phaser';
import { createPlayer, practiceLevel, stepPlayer } from '@game/core';
import { explorerMotion, updateExplorer } from './ExplorerSprite';
import goldAtlas from './assets/explorer-gold-animations.json';
import blueAtlas from './assets/explorer-blue-animations.json';

test('animation follows the simulation through running, jumping, falling and landing', () => {
  let state = createPlayer(practiceLevel);
  for (let i = 0; i < 60 && !state.grounded; i++) {
    state = stepPlayer(state, { direction: 0, jump: false }, practiceLevel);
  }
  expect(explorerMotion(state)).toBe('idle');
  state = stepPlayer(state, { direction: -1, jump: false }, practiceLevel);
  expect(explorerMotion(state)).toBe('run');
  expect(state.facing).toBe(-1);
  state = stepPlayer(state, { direction: 0, jump: true }, practiceLevel);
  expect(explorerMotion(state)).toBe('jump');
  let sawFall = false;
  for (let i = 0; i < 120 && !state.grounded; i++) {
    state = stepPlayer(state, { direction: 0, jump: false }, practiceLevel);
    if (!state.grounded && state.velocityY >= 0) {
      expect(explorerMotion(state)).toBe('fall');
      sawFall = true;
    }
  }
  expect(sawFall).toBe(true);
  expect(state.grounded).toBe(true);
  expect(explorerMotion(state)).toBe('idle');
});

test.each(['gold', 'blue'])(
  'completed %s airborne animation holds until motion changes',
  (color) => {
    const sprite = {
      texture: { key: `explorer-${color}-animated` },
      anims: {
        currentAnim: undefined as { key: string } | undefined,
        isPlaying: false,
      },
      setPosition: vi.fn(),
      setFlipX: vi.fn(),
      play: vi.fn((key: string) => {
        sprite.anims.currentAnim = { key };
      }),
    };
    const state = {
      ...createPlayer(practiceLevel),
      velocityY: -100,
      facing: -1 as const,
    };
    const rendered = sprite as unknown as Phaser.GameObjects.Sprite;
    updateExplorer(rendered, state);
    for (let i = 0; i < 20; i++) updateExplorer(rendered, state);
    expect(sprite.play.mock.calls).toEqual([
      [`explorer-${color}-animated-jump`],
    ]);
    updateExplorer(rendered, { ...state, velocityY: 0 });
    updateExplorer(rendered, { ...state, velocityY: 100 });
    expect(sprite.play.mock.calls.at(-1)).toEqual([
      `explorer-${color}-animated-fall`,
    ]);
    expect(sprite.play).toHaveBeenCalledTimes(2);
    expect(sprite.setFlipX).toHaveBeenLastCalledWith(true);
  },
);

test.each([
  ['gold', goldAtlas],
  ['blue', blueAtlas],
] as const)(
  '%s atlas has complete frames with a shared scale and foot baseline',
  (_color, atlas) => {
    expect(atlas.frames.map((frame) => frame.filename)).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i)),
    );
    for (const { frame, sourceSize, spriteSourceSize } of atlas.frames) {
      expect(frame.w).toBeGreaterThan(0);
      expect(frame.h).toBeGreaterThan(0);
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
      expect(frame.y + frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
      expect(sourceSize).toEqual({ w: 280, h: 360 });
      expect(spriteSourceSize.y + spriteSourceSize.h).toBe(sourceSize.h);
      expect(spriteSourceSize.x + spriteSourceSize.w).toBeLessThanOrEqual(
        sourceSize.w,
      );
    }
  },
);
