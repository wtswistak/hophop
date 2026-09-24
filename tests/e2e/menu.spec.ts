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
    await page.getByRole('button', { name: 'Otwórz scenę' }).click();
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.locator('canvas')).toBeVisible();
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
