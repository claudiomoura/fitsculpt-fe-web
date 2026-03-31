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

      // Wait for page to load - look for any article cards
      await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });

      // Look for the weight tracking card which has a "Registrar peso" button
      const registerWeightButton = page.getByRole('button', { name: /Registrar peso/i });
      await expect(registerWeightButton).toBeVisible({ timeout: 10000 });

      // Click the button to navigate to check-in
      await registerWeightButton.click();

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
