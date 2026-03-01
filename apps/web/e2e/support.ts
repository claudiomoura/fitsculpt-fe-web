import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { expect, type APIRequestContext, request, type Page } from '@playwright/test';
import type { TestInfo } from '@playwright/test';

const defaultBackendURL = 'http://localhost:4000';
const defaultDemoUserEmail = 'demo.user@fitsculpt.local';
const defaultDemoUserPassword = 'DemoUser123!';

export const authStorageStatePath = path.resolve(process.cwd(), 'e2e', '.auth', 'demo-user.json');

const LOG_DUMP_MAX_LINES = 80;
const failureLogPaths = ['/tmp/web-dev.log', '/tmp/api-dev.log'] as const;

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

export async function createDemoUserStorageState(storageStatePath: string = authStorageStatePath): Promise<void> {
  const backendURL = process.env.E2E_BACKEND_URL ?? defaultBackendURL;
  const authRequest = await request.newContext({
    baseURL: backendURL,
    storageState: undefined,
  });

  try {
    const loginResponse = await authRequest.post('/auth/login', {
      data: {
        email: process.env.E2E_DEMO_USER_EMAIL ?? defaultDemoUserEmail,
        password: process.env.E2E_DEMO_USER_PASSWORD ?? defaultDemoUserPassword,
      },
    });
    expect(loginResponse.ok(), 'demo user login should succeed during E2E global setup').toBeTruthy();

    const meResponse = await authRequest.get('/auth/me');
    expect(meResponse.ok(), 'demo user /auth/me should succeed during E2E global setup').toBeTruthy();

    await authRequest.storageState({ path: storageStatePath });
  } finally {
    await authRequest.dispose();
  }
}

function sanitizeLogLine(line: string): string {
  const secretPattern = /(bearer\s+[\w.-]+|token[=:]\s*[^\s]+|cookie[=:]\s*[^\s]+|set-cookie[=:]\s*[^\s]+)/gi;
  return line.replace(secretPattern, '[REDACTED]');
}

function printFailureLogSnippets(): void {
  for (const logPath of failureLogPaths) {
    if (!existsSync(logPath)) {
      console.log(`[e2e:failure-log] ${logPath} not found`);
      continue;
    }

    const lines = readFileSync(logPath, 'utf8').split('\n').slice(-LOG_DUMP_MAX_LINES).map(sanitizeLogLine);
    console.log(`[e2e:failure-log] tail -n ${LOG_DUMP_MAX_LINES} ${logPath}`);
    for (const line of lines) {
      console.log(`[e2e:failure-log] ${line}`);
    }
  }
}

export function attachConsoleErrorCollector(page: Page, testInfo?: TestInfo): () => void {
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

    if (testInfo && testInfo.status !== testInfo.expectedStatus) {
      printFailureLogSnippets();
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
