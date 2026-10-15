import { expect, test } from '@playwright/test';
test('opening and closing the scene does not leave extra canvases', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Gra platformowa' }),
  ).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Zagraj samemu' }).click();
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.locator('canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Otwórz menu gry' }).click();
    await page.getByRole('button', { name: 'Wróć do menu' }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('the development command starts the backend too', async ({ request }) => {
  await expect
    .poll(async () => {
      try {
        const response = await request.get('http://127.0.0.1:2567/health');
        return response.ok() ? response.json() : null;
      } catch {
        return null;
      }
    })
    .toEqual({ status: 'ok' });
});

test('game fills the viewport after rotation and navigation is inside the game menu', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Zagraj samemu' }).click();
  await expect(page.locator('.control-jump')).toBeEnabled();
  for (const size of [
    { width: 1280, height: 720 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(async () => {
        const box = await page.locator('canvas').boundingBox();
        return (
          box && {
            x: Math.round(box.x),
            y: Math.round(box.y),
            width: Math.round(box.width),
            height: Math.round(box.height),
          }
        );
      })
      .toEqual({ x: 0, y: 0, ...size });
  }
  await expect(page.getByRole('button', { name: 'Wróć do menu' })).toBeHidden();
  await page.getByRole('button', { name: 'Otwórz menu gry' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu gry' })).toBeVisible();
  await expect(page.locator('.control-jump')).toBeDisabled();
  await page.getByRole('button', { name: 'Wróć do gry' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.game-container')).toBeFocused();
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Otwórz menu gry' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.game-container')).toBeFocused();
});
