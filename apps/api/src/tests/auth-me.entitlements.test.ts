import assert from "node:assert/strict";
import { buildEffectiveEntitlements } from "../entitlements.js";
import { authMeResponseSchema, buildAuthMeResponse, buildSessionModules } from "../auth/schemas.js";

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
    membership: {
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
  assert.equal(typeof parsed.modules.strength, "boolean");
  assert.equal(typeof parsed.modules.nutrition, "boolean");
  assert.equal(typeof parsed.modules.ai, "boolean");
  assert.equal(parsed.modules.strength, true);
  assert.equal(parsed.modules.nutrition, false);
  assert.equal(parsed.modules.ai, true);
  const modulesFromEntitlements = buildSessionModules(entitlements);
  assert.deepEqual(parsed.modules, modulesFromEntitlements);
  assert.equal(parsed.subscriptionPlan, "STRENGTH_AI");
  assert.equal(parsed.plan, "STRENGTH_AI");
  assert.equal(parsed.aiEntitlements.strength, true);
  assert.equal(parsed.aiEntitlements.nutrition, false);
  assert.equal(parsed.tokenBalance, 7);
  assert.equal(parsed.gymMembershipState, "ACTIVE");
  assert.equal(parsed.gymRole, "TRAINER");
  assert.equal(parsed.gymId, "gym_123");
  assert.equal(parsed.gymName, "Demo Gym");
  assert.equal(parsed.isTrainer, true);


  const nullableStatusResponse = buildAuthMeResponse({
    user: {
      id: "user_2",
      email: "nullable@example.com",
      name: null,
      emailVerifiedAt: null,
      lastLoginAt: null,
      subscriptionStatus: null,
      currentPeriodEnd: null,
    },
    role: "USER",
    aiTokenBalance: null,
    aiTokenRenewalAt: null,
    entitlements,
    membership: null,
  });

  const nullableParsed = authMeResponseSchema.parse(nullableStatusResponse);
  assert.equal(nullableParsed.subscriptionStatus, null);
  assert.equal(typeof nullableParsed.modules.strength, "boolean");
  assert.equal(typeof nullableParsed.modules.nutrition, "boolean");
  assert.equal(typeof nullableParsed.modules.ai, "boolean");
  assert.equal(nullableParsed.gymMembershipState, "NONE");
  assert.equal(nullableParsed.gymRole, "USER");
  assert.equal(nullableParsed.isTrainer, false);

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
