import { expect, test } from '@playwright/test';

test.describe('Nutrition + checkin premium core', () => {
  test('nutrition state is actionable and checkin returns to Today', async ({ page }) => {
    await page.goto('/app/nutricion');

    const assignedPlan = page.getByTestId('member-assigned-nutrition-plan');
    const emptyState = page.getByTestId('member-nutrition-empty-state');

    if (await assignedPlan.count()) {
      await expect(assignedPlan).toBeVisible({ timeout: 15000 });
      const breakfastButton = page.getByTestId('nutrition-log-breakfast').first();
      if (await breakfastButton.count()) {
        await breakfastButton.click();
        await expect(page.getByText(/registrad|logged/i)).toBeVisible({ timeout: 10000 });
      }
    } else {
      await expect(emptyState).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('link', { name: /generar con ia o crear manual|create manually|crear manual/i })).toBeVisible({ timeout: 10000 });
    }

    await page.goto('/app/seguimiento/check-in');
    await expect(page.getByRole('heading', { name: /check-in/i })).toBeVisible({ timeout: 10000 });
    await page.getByTestId('checkin-quick-submit').click();
    await page.waitForURL(/\/app\/hoy\?checkin=success$/, { timeout: 15000 });
    await expect(page.getByText(/check-in guardado|check-in saved/i)).toBeVisible({ timeout: 10000 });
  });
});
