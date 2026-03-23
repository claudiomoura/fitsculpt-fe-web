import assert from "node:assert/strict";
import {
  PAID_SUBSCRIPTION_TOKEN_GRANT,
  shouldGrantTokensForBillingCycle,
  tokenGrantForPlan,
} from "../billing/tokenPolicy.js";

assert.equal(tokenGrantForPlan("PRO"), PAID_SUBSCRIPTION_TOKEN_GRANT);
assert.equal(tokenGrantForPlan("STRENGTH_AI"), PAID_SUBSCRIPTION_TOKEN_GRANT);
assert.equal(tokenGrantForPlan("NUTRI_AI"), PAID_SUBSCRIPTION_TOKEN_GRANT);
assert.equal(tokenGrantForPlan("FREE"), 0);

assert.equal(
  shouldGrantTokensForBillingCycle({
    plan: "PRO",
    currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
    aiTokenRenewalAt: null,
  }),
  true,
);
assert.equal(
  shouldGrantTokensForBillingCycle({
    plan: "PRO",
    currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
    aiTokenRenewalAt: new Date("2026-04-01T00:00:00.000Z"),
  }),
  false,
);
assert.equal(
  shouldGrantTokensForBillingCycle({
    plan: "PRO",
    currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
    aiTokenRenewalAt: new Date("2026-04-01T00:00:00.000Z"),
  }),
  true,
);
assert.equal(
  shouldGrantTokensForBillingCycle({
    plan: "FREE",
    currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
    aiTokenRenewalAt: null,
  }),
  false,
);

console.log("token policy test passed");
