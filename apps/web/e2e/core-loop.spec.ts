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
      const trackQuickActionButton = page.getByTestId('today-quick-action-track');
      await expect(firstTodayActionCard).toBeVisible({ timeout: 10_000 });
      await expect(trackQuickActionButton).toBeVisible({ timeout: 10_000 });

      const beforeCount = await fetchTrackingCount(page.request);

      const trackingPostRequestPromise = page.waitForRequest(
        (request) => request.method() === 'POST' && request.url().includes('/api/tracking'),
        { timeout: 10_000 },
      );

      await trackQuickActionButton.click();

      const trackingPostRequest = await trackingPostRequestPromise;
      const trackingPostResponse = await trackingPostRequest.response();
      expect(trackingPostResponse?.ok()).toBeTruthy();

      await expect
        .poll(async () => fetchTrackingCount(page.request), {
          timeout: 10_000,
          message: 'El count de checkins no subió después de clicar today-quick-action-track.',
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
