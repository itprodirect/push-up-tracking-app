import { expect, test } from '@playwright/test';

test('loads authenticated cloud data on first render', async ({ page }) => {
  const today = todayKey();

  await page.route('**/api/persistence', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entries: {
          [today]: { date: today, sets: [10] },
        },
        workouts: {},
      }),
    });
  });

  await page.goto('/');

  await expect(page.getByText('playwright@example.com')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Push-Ups' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(/Cloud data loaded\./);
  await expect(page.getByText('10 / 50')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
});

test('saves push-up progress and restores it after refresh', async ({ page }) => {
  let savedEntry: { date: string; sets: number[] } | null = null;

  await page.route('**/api/persistence', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: savedEntry ? { [savedEntry.date]: savedEntry } : {},
          workouts: {},
        }),
      });
      return;
    }

    const body = request.postDataJSON() as { entry?: { date: string; sets: number[] } | null };
    savedEntry = body.entry ?? null;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: '+10' }).click();

  await expect(page.getByRole('status')).toHaveText(/Saved\./);
  await expect(page.getByText('10 / 50')).toBeVisible();

  await page.reload();

  await expect(page.getByText('10 / 50')).toBeVisible();
});

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test('falls back to local storage when cloud save fails', async ({ page }) => {
  await page.route('**/api/persistence', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entries: {}, workouts: {} }),
      });
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'cloud unavailable' }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: '+10' }).click();

  await expect(page.getByRole('alert')).toHaveText(/changes are still stored locally/i);
  await expect(page.getByText('10 / 50')).toBeVisible();

  await page.reload();

  await expect(page.getByText('10 / 50')).toBeVisible();
});
