import { expect, test } from '@playwright/test';
import { attachConsoleErrorCollector, fetchTrackingCount } from './support';

test.describe('Core loop (demo anti-regression)', () => {
  test('login → Hoy → acción rápida → persistencia tras recarga', async ({ page }, testInfo) => {
    const assertNoConsoleErrors = attachConsoleErrorCollector(page, testInfo);

    try {
      await page.goto('/app/hoy');
      console.log(`[core-loop] URL after goto: ${page.url()}`);

      const todayActionsGrid = page.locator('.today-actions-grid');

      try {
        await expect(todayActionsGrid).toBeVisible({ timeout: 20_000 });
      } catch (error) {
        const pageTitle = await page.title().catch(() => '<title unavailable>');
        const headingText =
          (await page
            .locator('h1, [data-testid="page-title"], .page-title')
            .first()
            .textContent()
            .catch(() => null)) ?? '<heading unavailable>';

        console.error(
          `[core-loop] .today-actions-grid not visible. Final URL: ${page.url()} | Title: ${pageTitle} | Heading: ${headingText
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 160)}`,
        );

        throw error;
      }

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
