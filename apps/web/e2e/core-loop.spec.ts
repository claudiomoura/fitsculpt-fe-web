import { expect, test } from '@playwright/test';
import { attachConsoleErrorCollector, fetchTrackingCount, loginAsDemoUser, resetDemoState } from './support';

test.describe('Core loop (demo anti-regression)', () => {
  test('login → Hoy → acción rápida → persistencia tras recarga', async ({ page }) => {
    await resetDemoState();
    const assertNoConsoleErrors = attachConsoleErrorCollector(page);

    try {
      await loginAsDemoUser(page);

      await page.goto('/app/hoy');
      await expect(page.locator('.today-actions-grid')).toBeVisible();

      const beforeCount = await fetchTrackingCount(page.request);

      await Promise.all([
        page.waitForResponse(
          (response) => response.url().includes('/api/tracking') && response.request().method() === 'POST' && response.ok(),
        ),
        page.locator('.today-action-card').first().locator('.today-action-button').click(),
      ]);

      await expect.poll(async () => fetchTrackingCount(page.request)).toBeGreaterThan(beforeCount);

      await page.reload();

      await expect.poll(async () => fetchTrackingCount(page.request)).toBeGreaterThan(beforeCount);
    } finally {
      assertNoConsoleErrors();
    }
  });
});
