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
  const shouldLogNetworkInCI = process.env.CI === 'true';
  const authErrorCounts = new Map<string, number>();

  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') {
      errors.push(`console.error: ${message.text()}`);
    }
  };

  const onPageError = (error: Error) => {
    errors.push(`pageerror: ${error.message}`);
  };

  const getResponsePath = (url: string): string => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  };

  const onResponse = (response: { status: () => number; url: () => string; request: () => { method: () => string } }) => {
    if (!shouldLogNetworkInCI) {
      return;
    }

    const status = response.status();
    if (status < 400) {
      return;
    }

    const method = response.request().method();
    const path = getResponsePath(response.url());
    console.log(`[e2e:network-error] ${method} ${path} -> ${status}`);

    if (status === 401 || status === 502) {
      authErrorCounts.set(path, (authErrorCounts.get(path) ?? 0) + 1);
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  return () => {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('response', onResponse);

    if (shouldLogNetworkInCI && authErrorCounts.size > 0) {
      const topAuthErrorPaths = [...authErrorCounts.entries()]
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 5);

      console.log('[e2e:network-summary] Top 401/502 URL paths:');
      for (const [path, count] of topAuthErrorPaths) {
        console.log(`[e2e:network-summary] ${count}x ${path}`);
      }
    }

    expect(errors, errors.length > 0 ? `Console/runtime errors detected:\n${errors.join('\n')}` : undefined).toEqual([]);
  };
}

export async function fetchTrackingCount(requestContext: APIRequestContext): Promise<number> {
  const trackingResponse = await requestContext.get('/api/tracking');
  expect(trackingResponse.ok()).toBeTruthy();
  const tracking = (await trackingResponse.json()) as { checkins?: Array<{ id: string }> };
  return tracking.checkins?.length ?? 0;
}
