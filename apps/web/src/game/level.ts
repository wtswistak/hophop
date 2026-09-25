import type { LevelGeometry } from '@game/core';

// Technical course: three jumpable gaps, raised platforms and a low obstacle.
export const practiceLevel: LevelGeometry = {
  width: 3200,
  fallY: 720,
  spawn: { x: 96, y: 412 },
  platforms: [
    { x: 0, y: 460, width: 700, height: 260 },
    { x: 850, y: 460, width: 650, height: 260 },
    { x: 1650, y: 460, width: 600, height: 260 },
    { x: 2400, y: 460, width: 800, height: 260 },
    { x: 340, y: 370, width: 150, height: 24 },
    { x: 1080, y: 370, width: 160, height: 24 },
    { x: 1900, y: 412, width: 70, height: 48 },
    { x: 2660, y: 370, width: 160, height: 24 },
  ],
};
