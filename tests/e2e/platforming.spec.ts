import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Observe the rendered player instead of exposing simulation/debug state to the page.
async function playerPosition(page: Page) {
  const png = (await page.locator('canvas').screenshot()).toString('base64');
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let x = 0,
      y = 0,
      count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] === 244 && pixels[i + 1] === 191 && pixels[i + 2] === 96) {
        x += (i / 4) % canvas.width;
        y += Math.floor(i / 4 / canvas.width);
        count++;
      }
    }
    if (!count) throw new Error('Player is not visible');
    return { x: x / count, y: y / count };
  }, png);
}

async function openGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Zagraj lokalnie' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect
    .poll(async () => (await playerPosition(page)).x)
    .toBeGreaterThan(0);
}

test('keyboard moves and jumps, blur clears held movement', async ({
  page,
}) => {
  await openGame(page);
  const initial = await playerPosition(page);
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(async () => (await playerPosition(page)).x)
    .toBeGreaterThan(initial.x + 35);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await expect
    .poll(async () => (await playerPosition(page)).y, { intervals: [25] })
    .toBeLessThan(initial.y - 20);
  await expect
    .poll(async () => (await playerPosition(page)).y)
    .toBeCloseTo(initial.y, 0);
  await page.keyboard.down('ArrowLeft');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
  });
  const stopped = await playerPosition(page);
  // Observe multiple frames: a leaked held key would move the character.
  await page.waitForTimeout(250);
  expect((await playerPosition(page)).x).toBeCloseTo(stopped.x, 0);
  await page.keyboard.up('ArrowLeft');
});

test('walking beyond the first ledge respawns at the level start', async ({
  page,
}) => {
  await openGame(page);
  const initial = await playerPosition(page);
  await page.keyboard.down('ArrowRight');
  // Camera follows the player beyond its original screen position.
  await expect
    .poll(async () => (await playerPosition(page)).x)
    .toBeGreaterThan(initial.x + 200);
  await expect
    .poll(
      async () => {
        try {
          return (await playerPosition(page)).x;
        } catch {
          return Infinity;
        }
      },
      {
        timeout: 6000,
        intervals: [50],
      },
    )
    .toBeLessThan(initial.x + 25);
  await page.keyboard.up('ArrowRight');
});

test('two fingers move and jump together on a landscape phone', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await openGame(page);
    const initial = await playerPosition(page);
    const right = await page
      .getByRole('button', { name: 'Idź w prawo' })
      .boundingBox();
    const jump = await page
      .getByRole('button', { name: 'Skocz' })
      .boundingBox();
    if (!right || !jump) throw new Error('Missing touch controls');
    const session = await context.newCDPSession(page);
    const finger = {
      id: 1,
      x: right.x + right.width / 2,
      y: right.y + right.height / 2,
    };
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [finger],
    });
    await expect
      .poll(async () => (await playerPosition(page)).x)
      .toBeGreaterThan(initial.x + 15);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        finger,
        { id: 2, x: jump.x + jump.width / 2, y: jump.y + jump.height / 2 },
      ],
    });
    await expect
      .poll(async () => (await playerPosition(page)).y, { intervals: [25] })
      .toBeLessThan(initial.y - 15);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchCancel',
      touchPoints: [],
    });
    await expect
      .poll(async () => (await playerPosition(page)).y)
      .toBeCloseTo(initial.y, 0);
    const stopped = await playerPosition(page);
    await page.waitForTimeout(200);
    expect((await playerPosition(page)).x).toBeCloseTo(stopped.x, 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
