import type { LevelDefinition } from './types.js';

// Temporary technical course until the second campaign level is designed.
export const canyonCrossing: LevelDefinition = {
  id: 'canyon-v1',
  name: 'Druga przeprawa',
  mobs: [
    { id: 'scorpion-2', platformIndex: 5, x: 1540, speed: 85 },
    { id: 'scorpion-guard-2', platformIndex: 1, x: 1000, speed: 100 },
  ],
  width: 2800,
  fallY: 720,
  spawn: { x: 96, y: 412 },
  platforms: [
    { x: 0, y: 460, width: 550, height: 260 },
    { x: 690, y: 430, width: 500, height: 290 },
    { x: 1330, y: 460, width: 550, height: 260 },
    { x: 2020, y: 460, width: 780, height: 260 },
    { x: 2220, y: 412, width: 70, height: 48 },
    { x: 1500, y: 370, width: 160, height: 24 },
  ],
  finish: { x: 2640, y: 280, width: 64, height: 180 },
};
