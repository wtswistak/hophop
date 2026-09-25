import { expect, test } from 'vitest';
import { PlayerControls } from './PlayerControls';

test('movement and a queued jump can be pressed by different fingers', () => {
  const controls = new PlayerControls();
  controls.press('pointer:1', 'right');
  controls.press('pointer:2', 'jump');
  controls.release('pointer:2');
  expect(controls.read()).toEqual({ direction: 1, jump: true });
  expect(controls.read()).toEqual({ direction: 1, jump: false });
  controls.release('pointer:1');
  expect(controls.read()).toEqual({ direction: 0, jump: false });
});

test('releasing one source does not release another held source', () => {
  const controls = new PlayerControls();
  controls.press('key:ArrowRight', 'right');
  controls.press('pointer:1', 'right');
  controls.release('pointer:1');
  expect(controls.read().direction).toBe(1);
  controls.press('pointer:2', 'left');
  expect(controls.read().direction).toBe(0);
  controls.release('pointer:2');
  expect(controls.read().direction).toBe(1);
});

test('holding jump does not queue repeated jumps; reset clears all sources and pending actions', () => {
  const controls = new PlayerControls();
  controls.press('key:Space', 'jump');
  expect(controls.read().jump).toBe(true);
  controls.press('key:Space', 'jump');
  expect(controls.read().jump).toBe(false);
  controls.press('pointer:1', 'right');
  controls.press('pointer:2', 'jump');
  controls.reset();
  expect(controls.read()).toEqual({ direction: 0, jump: false });
});
