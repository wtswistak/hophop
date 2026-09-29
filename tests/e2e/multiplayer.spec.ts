import { expect, test } from '@playwright/test';

test('two browsers join the same session and a third player cannot enter', async ({
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
    await host!
      .getByRole('button', { name: 'Utwórz sesję multiplayer' })
      .click();
    const code = host!.getByRole('textbox', { name: 'Kod bieżącej sesji' });
    await expect(code).toBeVisible();
    const roomId = await code.inputValue();
    for (const page of [guest!, extra!]) {
      await page.goto('/');
      await page.getByLabel('Kod sesji od drugiego gracza').fill(roomId);
      await page.getByRole('button', { name: 'Dołącz do sesji' }).click();
      if (page === guest)
        await expect(page.getByRole('status')).toContainText('Gracze: 2/2');
    }
    await expect(host!.getByRole('status')).toContainText('Gracze: 2/2');
    await expect(guest!.getByRole('status')).toContainText('Gracze: 2/2');
    await expect(guest!.locator('canvas')).toBeVisible();
    await expect(extra!.getByRole('alert')).toContainText(
      'Nie udało się połączyć',
    );
    await guest!.getByRole('button', { name: 'Wróć do menu' }).click();
    await expect(host!.getByRole('status')).toContainText('Gracze: 1/2');
    await host!.getByRole('button', { name: 'Wróć do menu' }).click();
    await expect(host!.locator('canvas')).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Utwórz sesję multiplayer' }).click();
  await expect(page.getByRole('status')).toContainText('Uruchamianie serwera');
  await page.getByRole('button', { name: 'Anuluj' }).click();
  await expect(
    page.getByRole('button', { name: 'Zagraj lokalnie' }),
  ).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Zagraj lokalnie' }).click();
  await expect(page.locator('canvas')).toBeVisible();
});

test('a failed room creation is only retried when requested by the player', async ({
  page,
}) => {
  let attempts = 0;
  await page.route('**/matchmake/create/**', (route) => {
    attempts++;
    return attempts === 1 ? route.abort() : route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Utwórz sesję multiplayer' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(attempts).toBe(1);
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Kod bieżącej sesji' }),
  ).toBeVisible();
  expect(attempts).toBe(2);
  await page.getByRole('button', { name: 'Wróć do menu' }).click();
});
