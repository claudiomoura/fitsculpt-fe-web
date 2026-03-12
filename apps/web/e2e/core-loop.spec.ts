import { expect, test } from '@playwright/test';
import { attachConsoleErrorCollector, fetchTrackingCount } from './support';

test.describe('Core loop (demo anti-regression)', () => {
  test('login → Hoy → acción rápida → persistencia tras recarga', async ({ page }, testInfo) => {
    const assertNoConsoleErrors = attachConsoleErrorCollector(page, testInfo);

    try {
      await page.goto('/app/hoy');
      const heading = page.getByRole('heading', { name: /Acciones de hoy/i });
      await expect(heading).toBeVisible({ timeout: 10_000 });

      const todayActionsGrid = page.getByTestId('today-actions-grid');
      await expect(todayActionsGrid).toBeVisible({ timeout: 10_000 });

      const firstTodayActionCard = page.getByTestId('today-action-card').first();
      const quickActionTracking = page.getByTestId('quick-action-tracking');
      await expect(firstTodayActionCard).toBeVisible({ timeout: 10_000 });
      await expect(quickActionTracking).toBeVisible({ timeout: 10_000 });

      const beforeCount = await fetchTrackingCount(page.request);
      const trackingResponses: string[] = [];
      const logTrackingResponse = (response: import('@playwright/test').Response) => {
        if (response.request().method() !== 'POST' || !response.url().includes('/api/tracking')) return;
        trackingResponses.push(`${response.status()} ${response.url()}`);
      };
      page.on('response', logTrackingResponse);

      const trackingPostResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/api/tracking') && response.ok(),
        { timeout: 10_000 },
      );

      await quickActionTracking.click();

      const trackingPostResponse = await trackingPostResponsePromise.catch((error) => {
        console.error('[core-loop] POST /api/tracking responses seen:', trackingResponses);
        throw error;
      });
      page.off('response', logTrackingResponse);
      expect(trackingPostResponse.ok()).toBeTruthy();

      await expect
        .poll(async () => fetchTrackingCount(page.request), {
          timeout: 10_000,
          message: 'El count de checkins no subió después de clicar quick-action-tracking.',
        })
        .toBe(beforeCount + 1);

      await page.reload();
      await expect(heading).toBeVisible({ timeout: 10_000 });
      await expect(todayActionsGrid).toBeVisible({ timeout: 10_000 });

      const afterReloadCount = await fetchTrackingCount(page.request);
      expect(afterReloadCount).toBe(beforeCount + 1);
    } finally {
      assertNoConsoleErrors();
    }
  });
});
