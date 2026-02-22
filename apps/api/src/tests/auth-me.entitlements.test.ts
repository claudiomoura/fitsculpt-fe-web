import assert from "node:assert/strict";
import { buildEffectiveEntitlements } from "../entitlements.js";
import { authMeResponseSchema, buildAuthMeResponse } from "../auth/schemas.js";

function run() {
  const entitlements = buildEffectiveEntitlements({ plan: "STRENGTH_AI", isAdmin: false });

  const response = buildAuthMeResponse({
    user: {
      id: "user_1",
      email: "user@example.com",
      name: "User",
      emailVerifiedAt: null,
      lastLoginAt: null,
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: null,
    },
    role: "USER",
    aiTokenBalance: 7,
    aiTokenRenewalAt: new Date("2026-03-01T00:00:00.000Z"),
    entitlements,
    activeMembership: {
      gym: {
        id: "gym_123",
        name: "Demo Gym",
      },
      status: "ACTIVE",
      role: "TRAINER",
    },
  });

  const parsed = authMeResponseSchema.parse(response);
  assert.deepEqual(parsed.effectiveEntitlements, parsed.entitlements);
  assert.equal(parsed.effectiveEntitlements.version, "2026-02-01");
  assert.equal(parsed.effectiveEntitlements.modules.ai.enabled, true);
  assert.equal(parsed.subscriptionPlan, "PRO");
  assert.equal(parsed.plan, "PRO");
  assert.equal(parsed.gymMembershipState, "active");
  assert.equal(parsed.gymId, "gym_123");
  assert.equal(parsed.gymName, "Demo Gym");
  assert.equal(parsed.isTrainer, true);

  // Contract guard: if critical field names drift this must fail.
  const driftedPayload = {
    ...parsed,
    entitlements: undefined,
    effectiveEntitlements: undefined,
    entitlementz: parsed.effectiveEntitlements,
  };
  assert.throws(() => authMeResponseSchema.parse(driftedPayload));

  console.log("auth me entitlements contract tests passed");
}

run();
