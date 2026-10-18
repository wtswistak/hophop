import type { LevelDefinition } from './types.js';

export const canyonEntrance: LevelDefinition = {
  id: 'practice-v1',
  name: 'Wejście do kanionu',
  width: 9020,
  fallY: 720,
  spawn: { x: 96, y: 412 },
  platforms: [
    // Safe start, then three suspended slabs over the first ravine.
    { x: 0, y: 460, width: 700, height: 260 },
    { x: 820, y: 420, width: 380, height: 24 },
    { x: 1320, y: 460, width: 420, height: 24 },
    { x: 1860, y: 400, width: 300, height: 24 },
    { x: 2280, y: 440, width: 440, height: 280 },
    // Solid patrol island followed by another suspended crossing.
    { x: 2840, y: 460, width: 600, height: 260 },
    { x: 3580, y: 420, width: 320, height: 24 },
    { x: 4040, y: 380, width: 420, height: 24 },
    { x: 4600, y: 420, width: 360, height: 24 },
    { x: 5100, y: 460, width: 400, height: 260 },
    { x: 5640, y: 460, width: 600, height: 260 },
    // Final suspended climb, then solid ground and the last patrol.
    { x: 6380, y: 400, width: 320, height: 24 },
    { x: 6840, y: 440, width: 420, height: 24 },
    { x: 7400, y: 400, width: 360, height: 24 },
    { x: 7900, y: 460, width: 380, height: 260 },
    { x: 8420, y: 460, width: 600, height: 260 },
    // Low rocks break up the remaining flat approaches.
    { x: 400, y: 412, width: 80, height: 48 },
    { x: 2420, y: 392, width: 80, height: 48 },
    { x: 4740, y: 372, width: 80, height: 48 },
    { x: 7540, y: 352, width: 80, height: 48 },
  ],
  mobs: [
    {
      id: 'scorpion-1',
      platformIndex: 5,
      x: 3140,
      speed: 70,
      behavior: 'patrol',
    },
    {
      id: 'scorpion-2',
      platformIndex: 10,
      x: 5940,
      speed: 70,
      behavior: 'patrol',
    },
    {
      id: 'scorpion-3',
      platformIndex: 15,
      x: 8720,
      speed: 85,
      behavior: 'patrol',
    },
  ],
  finish: { x: 8860, y: 280, width: 64, height: 180 },
};
