import { expect, type APIRequestContext, request, type Page } from '@playwright/test';

const defaultBackendURL = 'http://localhost:4000';
const defaultDemoUserEmail = 'demo.user@fitsculpt.local';
const defaultDemoUserPassword = 'DemoUser123!';

export async function resetDemoState(tokenState: "empty" | "paid" = "empty"): Promise<void> {
  const backendURL = process.env.E2E_BACKEND_URL ?? defaultBackendURL;
  const resetRequest = await request.newContext({ baseURL: backendURL });

  try {
    const resetResponse = await resetRequest.post(`/dev/reset-demo?tokenState=${tokenState}`);
    expect(resetResponse.ok(), 'demo reset endpoint must be available before E2E').toBeTruthy();
  } finally {
    await resetRequest.dispose();
  }
}

export async function loginAsDemoUser(page: Page): Promise<void> {
  await page.goto('/login');

  await page.locator('input[name="email"]').fill(process.env.E2E_DEMO_USER_EMAIL ?? defaultDemoUserEmail);
  await page.locator('input[name="password"]').fill(process.env.E2E_DEMO_USER_PASSWORD ?? defaultDemoUserPassword);

  await Promise.all([
    page.waitForURL(/\/app(\/.*)?$/),
    page.locator('button[type="submit"]').click(),
  ]);
}

export function attachConsoleErrorCollector(page: Page): () => void {
  const errors: string[] = [];

  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') {
      errors.push(`console.error: ${message.text()}`);
    }
  };

  const onPageError = (error: Error) => {
    errors.push(`pageerror: ${error.message}`);
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return () => {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);

    expect(errors, errors.length > 0 ? `Console/runtime errors detected:\n${errors.join('\n')}` : undefined).toEqual([]);
  };
}

export async function fetchTrackingCount(requestContext: APIRequestContext): Promise<number> {
  const trackingResponse = await requestContext.get('/api/tracking');
  expect(trackingResponse.ok()).toBeTruthy();
  const tracking = (await trackingResponse.json()) as { checkins?: Array<{ id: string }> };
  return tracking.checkins?.length ?? 0;
}
