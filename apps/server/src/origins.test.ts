import { expect, test } from 'vitest';
import { isOriginAllowed, readAllowedOrigins } from './origins.js';

test('production requires exact HTTPS origins', () => {
  expect(() => readAllowedOrigins(undefined, true)).toThrow();
  for (const value of [
    '*',
    'null',
    'http://game.test',
    'https://game.test/',
    'https://game.test/path',
  ]) {
    expect(() => readAllowedOrigins(value, true)).toThrow();
  }
  const allowed = readAllowedOrigins(
    'https://game.test, https://preview.test',
    true,
  );
  expect(isOriginAllowed('https://game.test', allowed)).toBe(true);
  expect(isOriginAllowed('https://preview.test', allowed)).toBe(true);
  expect(isOriginAllowed('https://game.test.evil.test', allowed)).toBe(false);
  expect(isOriginAllowed('null', allowed)).toBe(false);
  expect(isOriginAllowed(null, allowed)).toBe(true);
});

test('development permits LAN origins unless explicitly restricted', () => {
  expect(
    isOriginAllowed(
      'http://192.168.1.5:5173',
      readAllowedOrigins(undefined, false),
    ),
  ).toBe(true);
  const allowed = readAllowedOrigins('http://localhost:5173', false);
  expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
  expect(isOriginAllowed('http://192.168.1.5:5173', allowed)).toBe(false);
});
