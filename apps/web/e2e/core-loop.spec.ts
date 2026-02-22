import { expect, request, test } from '@playwright/test';

test.describe('Core loop (demo anti-regression)', () => {
  test('login → Hoy → acción rápida → persistencia tras recarga', async ({ page }) => {
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

    await page.goto('/app/hoy');
    await expect(page.locator('.today-actions-grid')).toBeVisible();

    const beforeResponse = await page.request.get('/api/tracking');
    expect(beforeResponse.ok()).toBeTruthy();
    const beforeTracking = (await beforeResponse.json()) as { checkins?: Array<{ id: string }> };
    const beforeCount = beforeTracking.checkins?.length ?? 0;

    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/tracking') && response.request().method() === 'POST' && response.ok(),
      ),
      page.locator('.today-action-card').first().locator('.today-action-button').click(),
    ]);

    await expect
      .poll(async () => {
        const trackingResponse = await page.request.get('/api/tracking');
        const tracking = (await trackingResponse.json()) as { checkins?: Array<{ id: string }> };
        return tracking.checkins?.length ?? 0;
      })
      .toBeGreaterThan(beforeCount);

    await page.reload();

    await expect
      .poll(async () => {
        const trackingResponse = await page.request.get('/api/tracking');
        const tracking = (await trackingResponse.json()) as { checkins?: Array<{ id: string }> };
        return tracking.checkins?.length ?? 0;
      })
      .toBeGreaterThan(beforeCount);
  });
});
