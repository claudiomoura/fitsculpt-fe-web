import { expect, request, test, type APIRequestContext } from '@playwright/test';
import { attachConsoleErrorCollector, loginViaUI, resetDemoState } from './support';

const backendURL = process.env.E2E_BACKEND_URL ?? 'http://localhost:4000';
const demoUserEmail = process.env.E2E_DEMO_USER_EMAIL ?? 'demo.user@fitsculpt.local';
const demoUserPassword = process.env.E2E_DEMO_USER_PASSWORD ?? 'DemoUser123!';
const demoManagerEmail = process.env.E2E_MANAGER_EMAIL ?? 'demo-admin@fitsculpt.local';
const demoManagerPassword = process.env.E2E_MANAGER_PASSWORD ?? 'DemoAdmin123!';

type AuthMeResponse = {
  user?: { id?: string; email?: string };
  id?: string;
  email?: string;
};

type GymListResponse = {
  items?: Array<{ id: string; name: string }>;
  gyms?: Array<{ id: string; name: string }>;
};

type JoinRequestsResponse = {
  items?: Array<{
    membershipId?: string;
    id?: string;
    status?: string;
    userId?: string;
    user?: { email?: string | null };
    gym?: { id?: string | null };
  }>;
};

async function collectTrainerNutritionDebugInfo(page: import("@playwright/test").Page): Promise<string> {
  const currentUrl = page.url();
  const headingTexts = (await page.locator("h1, h2").allTextContents())
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 5);
  const bodySnippet = ((await page.locator("body").innerText()).replace(/\s+/g, " ").trim()).slice(0, 500);

  return [
    `current URL: ${currentUrl}`,
    `visible headings: ${headingTexts.length ? headingTexts.join(" | ") : "<none>"}`,
    `body snippet: ${bodySnippet || "<empty>"}`,
  ].join("\n");
}

async function ensureMemberJoinedGym(managerContext: APIRequestContext, memberContext: APIRequestContext, gymId: string, memberUserId: string): Promise<void> {
  const joinResponse = await memberContext.post('/gyms/join', { data: { gymId } });
  expect(joinResponse.ok(), 'member gym join request should succeed').toBeTruthy();

  let joinRequestId: string | null = null;

  await expect
    .poll(
      async () => {
        const pendingRequestsResponse = await managerContext.get('/admin/gym-join-requests');
        expect(pendingRequestsResponse.ok(), 'manager should fetch pending join requests').toBeTruthy();

        const pendingRequests = (await pendingRequestsResponse.json()) as JoinRequestsResponse;
        const targetRequest = (pendingRequests.items ?? []).find((item) => {
          const itemStatus = (item.status ?? 'PENDING').toUpperCase();
          const itemEmail = item.user?.email?.toLowerCase();
          return (
            (item.userId === memberUserId || itemEmail === demoUserEmail.toLowerCase()) &&
            item.gym?.id === gymId &&
            itemStatus === 'PENDING'
          );
        });

        joinRequestId = targetRequest?.membershipId ?? targetRequest?.id ?? null;
        return Boolean(joinRequestId);
      },
      {
        message: 'pending join request should appear for demo member',
        intervals: [500, 1000, 2000, 2000],
        timeout: 15_000,
      }
    )
    .toBeTruthy();

  expect(joinRequestId, 'join request id should exist for approval').toBeTruthy();

  await expect
    .poll(
      async () => {
        const acceptResponse = await managerContext.post(`/admin/gym-join-requests/${joinRequestId}/accept`);
        return acceptResponse.ok();
      },
      {
        message: 'manager should approve member join request',
        intervals: [500, 1000, 2000, 2000],
        timeout: 15_000,
      }
    )
    .toBeTruthy();
}

test.describe('Gym nutrition flow (manager assignment + member consumption)', () => {
  test('manager creates + assigns nutrition plan, member sees it and can navigate days', async ({ page }, testInfo) => {
    await resetDemoState();

    const managerContext = await request.newContext({ baseURL: backendURL });
    const memberContext = await request.newContext({ baseURL: backendURL });

    const assertNoConsoleErrors = attachConsoleErrorCollector(page, testInfo);
    const authGatewayErrors: Array<{ status: number; url: string }> = [];
    const onResponse = (response: { status: () => number; url: () => string }) => {
      const status = response.status();
      if (status === 401 || status === 502) {
        authGatewayErrors.push({ status, url: response.url() });
      }
    };
    page.on('response', onResponse);

    try {
      const managerLoginResponse = await managerContext.post('/auth/login', {
        data: { email: demoManagerEmail, password: demoManagerPassword },
      });
      expect(managerLoginResponse.ok(), 'manager login should succeed').toBeTruthy();

      const memberLoginResponse = await memberContext.post('/auth/login', {
        data: { email: demoUserEmail, password: demoUserPassword },
      });
      expect(memberLoginResponse.ok(), 'member login should succeed').toBeTruthy();

      const gymsResponse = await managerContext.get('/gyms');
      expect(gymsResponse.ok(), 'gym list should be available').toBeTruthy();
      const gymsPayload = (await gymsResponse.json()) as GymListResponse;
      const gymId = (gymsPayload.items ?? gymsPayload.gyms ?? [])[0]?.id;
      expect(gymId, 'at least one gym is required for nutrition flow').toBeTruthy();

      const managerMeResponse = await managerContext.get('/auth/me');
      expect(managerMeResponse.ok(), 'manager /auth/me should succeed').toBeTruthy();
      const managerMe = (await managerMeResponse.json()) as AuthMeResponse;
      const managerUserId = managerMe.user?.id ?? managerMe.id;
      expect(managerUserId, 'manager user id must exist').toBeTruthy();

      const memberMeResponse = await memberContext.get('/auth/me');
      expect(memberMeResponse.ok(), 'member /auth/me should succeed').toBeTruthy();
      const memberMe = (await memberMeResponse.json()) as AuthMeResponse;
      const memberUserId = memberMe.user?.id ?? memberMe.id;
      expect(memberUserId, 'member user id must exist').toBeTruthy();

      const assignTrainerRoleResponse = await managerContext.post(`/admin/users/${managerUserId}/assign-gym-role`, {
        data: { gymId, role: 'TRAINER' },
      });
      expect(assignTrainerRoleResponse.ok(), 'manager must become trainer in gym').toBeTruthy();

      await ensureMemberJoinedGym(managerContext, memberContext, gymId!, memberUserId!);

      const nutritionPlanTitle = `E2E Gym Nutrition Plan ${Date.now()}`;

      await loginViaUI(page, {
        email: demoManagerEmail,
        password: demoManagerPassword,
      });
      await page.goto('/app/trainer/nutrition-plans');
      await page.waitForURL('**/app/trainer/nutrition-plans', { timeout: 15_000 });
      await expect(page.getByTestId('trainer-nutrition-plans-page')).toBeVisible({ timeout: 15_000 });

      const createButton = page.getByTestId('create-nutrition-plan-button');
      try {
        await expect(createButton).toBeVisible({ timeout: 15_000 });
      } catch (error) {
        const debugInfo = await collectTrainerNutritionDebugInfo(page);
        throw new Error(
          `create nutrition plan button was not visible after loading trainer nutrition plans page.\n${debugInfo}\n${String(error)}`
        );
      }

      await page.getByTestId('create-nutrition-plan-title-input').fill(nutritionPlanTitle);
      await createButton.click();

      await expect
        .poll(
          async () => {
            const listText = (await page.getByTestId('nutrition-plan-list').innerText()).replace(/\s+/g, ' ').trim();
            return listText.includes(nutritionPlanTitle);
          },
          {
            message: `nutrition plan list should include created plan ${nutritionPlanTitle}`,
            intervals: [500, 1000, 1500, 2000],
            timeout: 20_000,
          }
        )
        .toBeTruthy();

      await page.getByTestId('assign-member-select').selectOption(memberUserId!);
      await page.getByTestId('assign-plan-select').selectOption({ label: nutritionPlanTitle });
      await page.getByTestId('assign-nutrition-plan-from-plans-page').click();
      await expect(page.getByTestId('nutrition-plan-assignment-success')).toContainText(nutritionPlanTitle);

      await expect
        .poll(
          async () => {
            const assignedResponse = await memberContext.get('/members/me/assigned-nutrition-plan');
            expect(assignedResponse.ok(), 'member should fetch assigned nutrition plan').toBeTruthy();
            const payload = (await assignedResponse.json()) as {
              assignedPlan?: { id?: string; title?: string };
            };
            return payload.assignedPlan;
          },
          {
            message: 'assigned nutrition plan should become available for member',
            intervals: [500, 1000, 2000, 2000],
            timeout: 15_000,
          }
        )
        .toMatchObject({ title: nutritionPlanTitle });

      await loginViaUI(page, {
        email: demoUserEmail,
        password: demoUserPassword,
      });
      await page.goto('/app/dietas');

      await page.waitForResponse(
        (response) =>
          response.url().includes('/api/nutrition-plans/assigned') &&
          response.request().method() === 'GET' &&
          response.status() === 200,
        { timeout: 15_000 }
      );

      await expect(page.getByRole('heading', { name: /dietas guardadas|saved diet plans/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('nutrition-assigned-plan-card')).toBeVisible({ timeout: 15_000 });

      const firstPlanCard = page.locator('[data-testid^="nutrition-plan-card-"]').first();
      await expect(firstPlanCard).toBeVisible();

      await firstPlanCard.locator('[data-testid^="nutrition-select-active-"]').click();
      await expect(page.locator('[data-testid="nutrition-active-plan-card"], [data-testid="nutrition-assigned-plan-card"]')).toBeVisible();

      await page.getByTestId('nutrition-go-calendar-cta').click();
      await page.waitForURL('**/app/nutricion**', { timeout: 15_000 });

      await expect(page.getByTestId('member-assigned-nutrition-plan')).toBeVisible();
      await expect(page.getByTestId('member-assigned-nutrition-plan-title')).toContainText(nutritionPlanTitle);
      await expect(page.getByTestId('nutrition-day-nav')).toBeVisible();

      const kpis = page.locator('.nutrition-week-kpi');

      const getSelectedKpiIndex = async (): Promise<number> => {
        const selectedIndex = await kpis.evaluateAll((nodes) =>
          nodes.findIndex((node) => node.classList.contains('is-selected'))
        );
        expect(selectedIndex, 'one nutrition week KPI should be selected').toBeGreaterThanOrEqual(0);
        return selectedIndex;
      };

      const clickDifferentKpi = async (currentIndex: number, blockedIndex?: number): Promise<number> => {
        const kpiCount = await kpis.count();
        expect(kpiCount, 'nutrition day nav should expose at least two KPI items').toBeGreaterThanOrEqual(2);

        const candidateCount = Math.min(kpiCount, 3);
        let targetIndex = (currentIndex + 1) % candidateCount;
        if (blockedIndex !== undefined && targetIndex === blockedIndex) {
          targetIndex = (targetIndex + 1) % candidateCount;
        }
        if (targetIndex === currentIndex) {
          targetIndex = (currentIndex + 1) % kpiCount;
        }

        await kpis.nth(targetIndex).click();

        await expect.poll(getSelectedKpiIndex, { message: `selected KPI index should switch to ${targetIndex}` }).toBe(targetIndex);
        await expect(kpis.nth(targetIndex)).toHaveClass(/is-selected/);
        if (currentIndex !== targetIndex) {
          await expect(kpis.nth(currentIndex)).not.toHaveClass(/is-selected/);
        }

        return targetIndex;
      };

      const selectedIndexBefore = await getSelectedKpiIndex();
      const selectedIndexAfterFirstNav = await clickDifferentKpi(selectedIndexBefore);
      expect(selectedIndexAfterFirstNav).not.toEqual(selectedIndexBefore);

      const selectedIndexAfterSecondNav = await clickDifferentKpi(selectedIndexAfterFirstNav, selectedIndexBefore);
      expect(selectedIndexAfterSecondNav).not.toEqual(selectedIndexAfterFirstNav);

      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Application error');
      await expect(page.locator('body')).not.toContainText('Something went wrong');
      expect(authGatewayErrors, 'page should not emit network 401/502 responses').toEqual([]);
    } finally {
      page.off('response', onResponse);
      await managerContext.dispose();
      await memberContext.dispose();
      assertNoConsoleErrors();
    }
  });
});
