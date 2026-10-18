import type { LevelDefinition } from './types.js';

export const canyonCrossing: LevelDefinition = {
  id: 'canyon-v1',
  name: 'Druga przeprawa',
  width: 9500,
  fallY: 720,
  spawn: { x: 96, y: 412 },
  platforms: [
    // A short approach introduces a climb across narrow floating ledges.
    { x: 0, y: 460, width: 560, height: 260 },
    { x: 700, y: 400, width: 240, height: 24 },
    { x: 1080, y: 340, width: 260, height: 24 },
    { x: 1480, y: 400, width: 240, height: 24 },
    // The first pursuer stays on a solid island, clear of the next ascent.
    { x: 1860, y: 460, width: 560, height: 260 },
    { x: 2560, y: 400, width: 260, height: 24 },
    { x: 2960, y: 340, width: 240, height: 24 },
    { x: 3340, y: 380, width: 280, height: 24 },
    { x: 3760, y: 440, width: 360, height: 280 },
    // Alternate pursuing scorpions with suspended climbs and descents.
    { x: 4260, y: 460, width: 560, height: 260 },
    { x: 4960, y: 400, width: 240, height: 24 },
    { x: 5340, y: 340, width: 220, height: 24 },
    { x: 5700, y: 400, width: 240, height: 24 },
    { x: 6080, y: 460, width: 560, height: 260 },
    { x: 6780, y: 400, width: 260, height: 24 },
    { x: 7180, y: 340, width: 240, height: 24 },
    { x: 7560, y: 400, width: 280, height: 24 },
    // One last pursuer, a raised stepping stone and a safe finish.
    { x: 7980, y: 460, width: 560, height: 260 },
    { x: 8680, y: 400, width: 260, height: 24 },
    { x: 9080, y: 460, width: 420, height: 260 },
    { x: 320, y: 404, width: 80, height: 56 },
    { x: 3890, y: 384, width: 80, height: 56 },
  ],
  mobs: [
    {
      id: 'canyon-scorpion-1',
      platformIndex: 4,
      x: 2140,
      speed: 70,
      behavior: 'chase',
    },
    {
      id: 'canyon-scorpion-2',
      platformIndex: 9,
      x: 4540,
      speed: 85,
      behavior: 'chase',
    },
    {
      id: 'canyon-scorpion-3',
      platformIndex: 13,
      x: 6360,
      speed: 85,
      behavior: 'chase',
    },
    {
      id: 'canyon-scorpion-4',
      platformIndex: 17,
      x: 8260,
      speed: 85,
      behavior: 'chase',
    },
  ],
  finish: { x: 9340, y: 280, width: 64, height: 180 },
};
