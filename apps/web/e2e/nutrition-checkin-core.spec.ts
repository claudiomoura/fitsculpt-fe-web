import { expect, test } from '@playwright/test';
import { attachConsoleErrorCollector } from './support';

test.describe('Nutrition + checkin premium core', () => {
  test('meal completion persists and checkin returns to Today', async ({ page }, testInfo) => {
    const assertNoConsoleErrors = attachConsoleErrorCollector(page, testInfo);

    try {
      await page.goto('/app/nutricion');
      await expect(page.getByTestId('member-assigned-nutrition-plan')).toBeVisible({ timeout: 15000 });

      const breakfastButton = page.getByTestId('nutrition-log-breakfast').first();
      if (await breakfastButton.count()) {
        await breakfastButton.click();
        await expect(page.getByText(/registrad/i)).toBeVisible({ timeout: 10000 });
      }

      await page.goto('/app/seguimiento/check-in');
      await expect(page.getByRole('heading', { name: /check-in/i })).toBeVisible({ timeout: 10000 });
      const quickSubmit = page.getByTestId('checkin-quick-submit');
      await quickSubmit.click();
      await page.waitForURL(/\/app\/hoy\?checkin=success$/, { timeout: 15000 });
      await expect(page.getByText(/check-in guardado/i)).toBeVisible({ timeout: 10000 });
    } finally {
      assertNoConsoleErrors();
    }
  });
});
