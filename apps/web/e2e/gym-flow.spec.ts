import { expect, request, test } from '@playwright/test';
import { attachConsoleErrorCollector, loginAsDemoUser, resetDemoState } from './support';

const backendURL = process.env.E2E_BACKEND_URL ?? 'http://localhost:4000';
const demoUserEmail = process.env.E2E_DEMO_USER_EMAIL ?? 'demo.user@fitsculpt.local';
const demoUserPassword = process.env.E2E_DEMO_USER_PASSWORD ?? 'DemoUser123!';
const demoManagerEmail = process.env.E2E_MANAGER_EMAIL ?? 'demo-admin@fitsculpt.local';
const demoManagerPassword = process.env.E2E_MANAGER_PASSWORD ?? 'DemoAdmin123!';

type AuthMeResponse = {
  user?: {
    id?: string;
    email?: string;
  };
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

test.describe('Gym flow smoke (manager approval + assignment)', () => {
  test('login → join gym → manager approves → manager assigns plan → member sees assigned plan', async ({ page }, testInfo) => {
    await resetDemoState();

    const managerContext = await request.newContext({ baseURL: backendURL });
    const memberContext = await request.newContext({ baseURL: backendURL });

    const assertNoConsoleErrors = attachConsoleErrorCollector(page, testInfo);

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
      const gyms = gymsPayload.items ?? gymsPayload.gyms ?? [];
      const gymId = gyms[0]?.id;
      expect(gymId, 'at least one gym is required for smoke flow').toBeTruthy();

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
      expect(assignTrainerRoleResponse.ok(), 'manager must become gym TRAINER to approve/assign').toBeTruthy();

      const joinResponse = await memberContext.post('/gyms/join', {
        data: { gymId },
      });
      expect(joinResponse.ok(), 'member gym join request should succeed').toBeTruthy();

      let lastPendingRequestsPayload: JoinRequestsResponse | null = null;
      let joinRequest: { membershipId: string | null; requestId: string | null } | null = null;
      try {
        await expect
          .poll(
            async () => {
              const pendingRequestsResponse = await managerContext.get('/admin/gym-join-requests');
              expect(pendingRequestsResponse.ok(), 'manager should fetch pending join requests').toBeTruthy();

              const pendingRequests = (await pendingRequestsResponse.json()) as JoinRequestsResponse;
              lastPendingRequestsPayload = pendingRequests;

              const targetRequest = (pendingRequests.items ?? []).find((item) => {
                const itemEmail = item.user?.email?.toLowerCase();
                const itemUserId = item.userId ?? null;
                const itemStatus = (item.status ?? 'PENDING').toUpperCase();

                return (
                  (itemUserId === memberUserId || itemEmail === demoUserEmail.toLowerCase()) &&
                  item.gym?.id === gymId &&
                  itemStatus === 'PENDING'
                );
              });

              joinRequest = targetRequest
                ? {
                    membershipId: targetRequest.membershipId ?? null,
                    requestId: targetRequest.id ?? null,
                  }
                : null;

              return Boolean(joinRequest);
            },
            {
              message: 'pending join request should appear for the demo member before manager approval',
              intervals: [500, 1000, 2000, 2000, 2000],
              timeout: 15_000,
            }
          )
          .toBeTruthy();
      } catch {
        const safePayload = JSON.stringify(lastPendingRequestsPayload ?? { items: [] }, null, 2);
        console.log(`[e2e:manager:join-requests] ${safePayload}`);
        throw new Error('pending join request should appear for the demo member before manager approval');
      }

      const joinRequestId = joinRequest?.membershipId ?? joinRequest?.requestId;

      expect(joinRequestId, 'join request id should be available for approval').toBeTruthy();

      const acceptEndpoint = `/admin/gym-join-requests/${joinRequestId}/accept`;
      await expect
        .poll(
          async () => {
            const acceptResponse = await managerContext.post(acceptEndpoint);
            if (acceptResponse.ok()) {
              return true;
            }

            let responseBody = '';
            try {
              responseBody = await acceptResponse.text();
            } catch {
              responseBody = '<response body unavailable>';
            }

            const normalizedBody = responseBody || '<empty response body>';
            const truncatedBody = normalizedBody.length > 500 ? `${normalizedBody.slice(0, 500)}…` : normalizedBody;
            console.log(`[e2e:manager:accept-retry] status=${acceptResponse.status()} body=${truncatedBody}`);

            return false;
          },
          {
            message: 'manager should approve pending join request',
            intervals: [500, 1000, 2000, 2000, 2000],
            timeout: 15_000,
          }
        )
        .toBeTruthy();

      const createdPlanTitle = `E2E Gym Smoke Plan ${Date.now()}`;
      let createdPlan: { id?: string } = {};
      await expect
        .poll(
          async () => {
            const createPlanResponse = await managerContext.post('/training-plans', {
              data: {
                title: createdPlanTitle,
                goal: 'general_fitness',
                level: 'beginner',
                focus: 'full_body',
                equipment: 'gym',
                daysPerWeek: 3,
                startDate: '2026-01-01',
                daysCount: 7,
              },
            });

            if (!createPlanResponse.ok()) {
              let responseBody = '';
              try {
                responseBody = await createPlanResponse.text();
              } catch {
                responseBody = '<response body unavailable>';
              }

              const normalizedBody = responseBody || '<empty response body>';
              const truncatedBody = normalizedBody.length > 500 ? `${normalizedBody.slice(0, 500)}…` : normalizedBody;
              const correlationId = createPlanResponse.headers()['x-correlation-id'];
              if (createPlanResponse.status() === 500) {
                console.log(
                  `[e2e:manager:create-plan-retry:500] correlationId=${correlationId ?? '<missing>'} body=${truncatedBody}`
                );
              }
              console.log(
                `[e2e:manager:create-plan-retry] status=${createPlanResponse.status()} correlationId=${correlationId ?? '<missing>'} body=${truncatedBody}`
              );
              return false;
            }

            createdPlan = (await createPlanResponse.json()) as { id?: string };
            return true;
          },
          {
            message: 'manager should create a training plan',
            intervals: [500, 1000, 2000, 2000, 2000],
            timeout: 15_000,
          }
        )
        .toBeTruthy();
      expect(createdPlan.id, 'created training plan id should exist').toBeTruthy();

      const assignPlanResponse = await managerContext.post(`/trainer/members/${memberUserId}/training-plan-assignment`, {
        data: { trainingPlanId: createdPlan.id },
      });
      expect(assignPlanResponse.ok(), 'manager should assign created plan to member').toBeTruthy();

      await expect
        .poll(
          async () => {
            const memberActivePlanResponse = await memberContext.get('/training-plans/active');
            expect(memberActivePlanResponse.ok(), 'member should read active plan').toBeTruthy();

            const memberActivePlanPayload = (await memberActivePlanResponse.json()) as {
              source?: string;
              plan?: { id?: string; title?: string };
            };

            return {
              source: memberActivePlanPayload.source,
              planId: memberActivePlanPayload.plan?.id,
              title: memberActivePlanPayload.plan?.title,
            };
          },
          {
            message: 'member active plan should resolve to the assigned plan',
            intervals: [500, 1000, 2000],
            timeout: 15_000,
          }
        )
        .toMatchObject({
          source: 'assigned',
          planId: createdPlan.id,
          title: createdPlanTitle,
        });

      await loginAsDemoUser(page);
      await page.goto('/app/entrenamiento');

      await expect(page.locator('.status-card strong')).toContainText(createdPlanTitle);
    } finally {
      await managerContext.dispose();
      await memberContext.dispose();
      assertNoConsoleErrors();
    }
  });
});
