import { expect, test } from '@playwright/test';

test('two browsers choose a lobby and start only after both are ready', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  try {
    const [host, guest, extra] = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    await host!.goto('/');
    await host!.getByRole('button', { name: 'Multiplayer' }).click();
    await host!.getByLabel('Twój nick').fill('Alice');
    await host!.getByRole('button', { name: 'Utwórz lobby' }).click();
    await expect(
      host!.getByRole('textbox', { name: 'Kod bieżącego lobby' }),
    ).toBeVisible();
    await expect(host!.locator('canvas')).toHaveCount(0);

    await guest!.goto('/');
    await guest!.getByRole('button', { name: 'Multiplayer' }).click();
    await guest!.getByLabel('Twój nick').fill('Bob');
    await guest!.getByRole('button', { name: 'Dołącz' }).first().click();
    await expect(host!.getByRole('status').first()).toContainText(
      'Gracze: 2/2',
    );
    await expect(guest!.getByText('Alice')).toBeVisible();
    await host!.getByRole('button', { name: 'Gotowy', exact: true }).click();
    await expect(host!.locator('canvas')).toHaveCount(0);
    await expect(guest!.locator('canvas')).toHaveCount(0);

    await extra!.goto('/');
    await extra!.getByRole('button', { name: 'Multiplayer' }).click();
    await expect(extra!.getByRole('button', { name: 'Dołącz' })).toHaveCount(0);

    await guest!.getByRole('button', { name: 'Gotowy', exact: true }).click();
    await expect(host!.getByText(/Start za [1-3]…/)).toBeVisible();
    await expect(host!.locator('canvas')).toBeVisible({ timeout: 10000 });
    await expect(guest!.locator('canvas')).toBeVisible();
    await expect(host!.locator('.control-jump')).toBeEnabled();
    await expect(guest!.locator('.control-jump')).toBeEnabled();
    await host!.getByRole('button', { name: 'Otwórz menu gry' }).click();
    await host!.getByRole('button', { name: 'Wróć do menu' }).click();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('waiting for a sleeping server can be cancelled to play locally', async ({
  page,
}) => {
  await page.route('**/health', (route) =>
    route.fulfill({ status: 503, body: 'Starting' }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await expect(page.getByRole('status')).toContainText('Uruchamianie serwera');
  await page.getByRole('button', { name: 'Anuluj' }).click();
  await page.getByRole('button', { name: 'Wróć', exact: true }).click();
  await page.getByRole('button', { name: 'Zagraj samemu' }).click();
  await expect(page.locator('canvas')).toBeVisible();
});

test('a failed lobby creation is only retried when requested by the player', async ({
  page,
}) => {
  let attempts = 0;
  await page.route('**/matchmake/create/**', (route) => {
    attempts++;
    return attempts === 1 ? route.abort() : route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByLabel('Twój nick').fill('Alice');
  await page.getByRole('button', { name: 'Utwórz lobby' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(attempts).toBe(1);
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Kod bieżącego lobby' }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});
