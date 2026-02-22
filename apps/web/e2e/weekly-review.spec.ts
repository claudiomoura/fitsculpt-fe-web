import { expect, request, test } from '@playwright/test';

test.describe('Weekly review (lite anti-regression)', () => {
  test('loads weekly review without breaking authenticated navigation', async ({ page }) => {
    const backendURL = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:4000';

    const resetRequest = await request.newContext({ baseURL: backendURL });
    const resetResponse = await resetRequest.post('/dev/reset-demo');
    expect(resetResponse.ok(), 'demo reset endpoint must be available before E2E').toBeTruthy();
    await resetRequest.dispose();

    await page.goto('/login');

    await page.locator('input[name="email"]').fill(process.env.E2E_DEMO_USER_EMAIL ?? 'demo.user@fitsculpt.local');
    await page.locator('input[name="password"]').fill(process.env.E2E_DEMO_USER_PASSWORD ?? 'DemoUser123!');

    await Promise.all([
      page.waitForURL(/\/app(\/.*)?$/),
      page.locator('button[type="submit"]').click(),
    ]);

    const weeklyReviewResponse = page.waitForResponse(
      (response) => response.url().includes('/api/review/weekly') && response.request().method() === 'GET',
    );

    await page.goto('/app/weekly-review');

    const reviewApi = await weeklyReviewResponse;
    expect(reviewApi.ok()).toBeTruthy();

    await expect(page.getByRole('heading', { name: /Weekly review|Revisión semanal/i })).toBeVisible();

    await page.goto('/app/hoy');
    await expect(page.locator('.today-actions-grid')).toBeVisible();
  });
});
