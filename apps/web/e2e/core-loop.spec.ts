import { expect, test } from '@playwright/test';
import { attachConsoleErrorCollector } from './support';

test.describe('Core loop (demo anti-regression)', () => {
  test('login → Hoy → check-in CTA opens real flow without fake writes', async ({ page }, testInfo) => {
    const assertNoConsoleErrors = attachConsoleErrorCollector(page, testInfo);
    const trackingWrites: string[] = [];
    const trackWrite = (request: { method: () => string; url: () => string }) => {
      if (request.method() === 'POST' && request.url().includes('/api/tracking')) {
        trackingWrites.push(`${request.method()} ${request.url()}`);
      }
    };

    page.on('request', trackWrite);

    try {
      await page.goto('/app/hoy');
      const todayPage = page.getByTestId('today-page');
      await expect(todayPage).toBeVisible({ timeout: 10000 });

      const todayActionsGrid = page.getByTestId('today-actions-grid');
      await expect(todayActionsGrid).toBeVisible({ timeout: 10000 });

      const quickActionTracking = page.getByTestId('quick-action-tracking');
      await expect(quickActionTracking).toBeVisible({ timeout: 10000 });

      await quickActionTracking.click();

      await page.waitForURL(/\/app\/seguimiento\/check-in$/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /check-in/i })).toBeVisible({ timeout: 10000 });

      await page.reload();
      await page.waitForURL(/\/app\/seguimiento\/check-in$/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /check-in/i })).toBeVisible({ timeout: 10000 });

      expect(trackingWrites).toEqual([]);
    } finally {
      page.off('request', trackWrite);
      assertNoConsoleErrors();
    }
  });
});
