import { expect, test } from '@playwright/test';
import { loginAsDemoUser, resetDemoState } from './support';

type AuthMePayload = {
  aiTokenBalance?: number;
  tokenBalance?: number;
};


test.describe('AI token lifecycle smoke', () => {
  test('blocks AI generation and avoids IA calls when user has 0 tokens', async ({ page }) => {
    await resetDemoState('empty');
    await loginAsDemoUser(page);

    await page.goto('/app/entrenamiento');

    const aiGenerateRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/ai/') && request.url().includes('/generate')) {
        aiGenerateRequests.push(request.url());
      }
    });

    await page.getByRole('button', { name: /Generar con IA|Generate with AI/i }).click();

    await expect(page.getByRole('heading', { name: /Tokens IA agotados|AI tokens exhausted/i })).toBeVisible();
    await expect(page.getByText(/No tienes tokens suficientes para usar la IA\.|You don't have enough tokens to use AI\./i)).toBeVisible();
    expect(aiGenerateRequests, 'AI generate endpoints must not be called with 0 tokens').toEqual([]);
  });

  test('allows AI generation and reduces balance when user has paid tokens', async ({ page }) => {
    await resetDemoState('paid');
    await loginAsDemoUser(page);

    const getBalance = async (): Promise<number> => {
      const meResponse = await page.request.get('/api/auth/me');
      expect(meResponse.ok()).toBeTruthy();
      const me = (await meResponse.json()) as AuthMePayload;
      const balance = typeof me.aiTokenBalance === 'number' ? me.aiTokenBalance : me.tokenBalance;
      expect(typeof balance).toBe('number');
      return balance as number;
    };

    const beforeBalance = await getBalance();
    expect(beforeBalance).toBeGreaterThan(0);

    await page.goto('/app/entrenamiento');

    const generateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/api/ai/training-plan/generate') &&
        response.status() === 200,
    );

    await page.getByRole('button', { name: /Generar con IA|Generate with AI/i }).click();
    await generateResponsePromise;

    await expect.poll(async () => getBalance()).toBeLessThan(beforeBalance);
  });
});
