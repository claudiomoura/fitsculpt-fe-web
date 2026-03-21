import assert from "node:assert/strict";
import { getStripeSubscriptionPeriodEnd } from "../billing/stripeSubscriptionPeriods.js";

assert.equal(
  getStripeSubscriptionPeriodEnd({
    current_period_end: 1774215474,
  })?.toISOString(),
  "2026-03-22T21:37:54.000Z",
);

assert.equal(
  getStripeSubscriptionPeriodEnd({
    items: {
      data: [
        { current_period_end: 1774215474 },
        { current_period_end: 1774129074 },
      ],
    },
  })?.toISOString(),
  "2026-03-22T21:37:54.000Z",
);

assert.equal(
  getStripeSubscriptionPeriodEnd({
    current_period_end: null,
    items: { data: [] },
  }),
  null,
);

console.log("stripe subscription periods test passed");
