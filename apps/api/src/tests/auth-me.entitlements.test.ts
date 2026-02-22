import assert from "node:assert/strict";
import { buildEffectiveEntitlements } from "../entitlements.js";
import { buildAuthMeResponse } from "../auth/schemas.js";

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
    activeMembership: null,
  });

  assert.deepEqual(response.effectiveEntitlements, response.entitlements);
  assert.equal(response.effectiveEntitlements.version, "2026-02-01");
  assert.equal(response.subscriptionPlan, "PRO");
  assert.equal(response.plan, "PRO");

  console.log("auth me entitlements tests passed");
}

run();
