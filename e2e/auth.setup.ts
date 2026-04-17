import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { AUTH_STATE_PATH, E2E_AUTH_EMAIL, writeAuthenticatedSession } from './support';

setup('seed reusable authenticated browser state', async ({ page }) => {
  await page.route('**/api/persistence', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: {}, workouts: {} }),
    });
  });

  await page.goto('/');
  await writeAuthenticatedSession(page);
  await page.reload();

  await expect(page.getByText(E2E_AUTH_EMAIL)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Push-Ups' })).toBeVisible();

  await mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
