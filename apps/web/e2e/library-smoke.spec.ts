import { expect, test } from '@playwright/test';
import { attachConsoleErrorCollector, loginAsDemoUser, resetDemoState } from './support';

test.describe('Library smoke (demo anti-regression)', () => {
  test('login → Biblioteca (lista) → detalle de ejercicio', async ({ page }, testInfo) => {
    await resetDemoState();
    const assertNoConsoleErrors = attachConsoleErrorCollector(page, testInfo);

    try {
      await loginAsDemoUser(page);

      const exercisesResponse = page.waitForResponse(
        (response) => response.url().includes('/api/exercises?') && response.request().method() === 'GET' && response.ok(),
      );

      await page.goto('/app/biblioteca');
      await exercisesResponse;

      await expect(page.locator('.library-card-link').first()).toBeVisible();

      await page.locator('.library-card-link').first().click();

      await expect(page).toHaveURL(/\/app\/biblioteca\/.+/);
      await expect(page.locator('.section-title').first()).toBeVisible();
    } finally {
      assertNoConsoleErrors();
    }
  });
});
