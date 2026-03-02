import { expect, test } from '@playwright/test';
import { attachConsoleErrorCollector, fetchTrackingCount } from './support';

test.describe('Core loop (demo anti-regression)', () => {
  test('login → Hoy → acción rápida → persistencia tras recarga', async ({ page }, testInfo) => {
    const assertNoConsoleErrors = attachConsoleErrorCollector(page, testInfo);

    try {
      await page.goto('/app/hoy');
      const heading = page.getByRole('heading', { name: /Acciones de hoy/i });
      await expect(heading).toBeVisible({ timeout: 10_000 });

      const finalUrl = page.url();
      const title = await page.title();
      const headingText = await heading.first().textContent();
      console.log(`[core-loop] URL final: ${finalUrl}`);
      console.log(`[core-loop] title: ${title}`);
      console.log(`[core-loop] heading: ${headingText?.trim() ?? '(vacío)'}`);

      const todayActionsGrid = page.locator('[data-testid="today-actions-grid"]');
      const todayActionCards = page.locator('.today-action-card');
      const todayActionButtons = page.locator('.today-action-button');

      if ((await todayActionsGrid.count()) > 0) {
        await expect(todayActionsGrid).toBeVisible({ timeout: 10_000 });
      } else {
        await expect
          .poll(async () => {
            const cardCount = await todayActionCards.count();
            const buttonCount = await todayActionButtons.count();
            return Math.max(cardCount, buttonCount);
          }, {
            timeout: 10_000,
            message:
              'No se encontraron acciones en Hoy: no existe [data-testid="today-actions-grid"] y tampoco hay .today-action-card ni .today-action-button',
          })
          .toBeGreaterThan(0);
      }

      const beforeCount = await fetchTrackingCount(page.request);

      await Promise.all([
        page.waitForResponse(
          (response) => response.url().includes('/api/tracking') && response.request().method() === 'POST' && response.ok(),
        ),
        page.locator('.today-action-button').first().click(),
      ]);

      await expect.poll(async () => fetchTrackingCount(page.request)).toBeGreaterThan(beforeCount);

      await page.reload();

      await expect.poll(async () => fetchTrackingCount(page.request)).toBeGreaterThan(beforeCount);
    } finally {
      assertNoConsoleErrors();
    }
  });
});
