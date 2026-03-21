import assert from "node:assert/strict";

import { PAID_SUBSCRIPTION_TOKEN_GRANT } from "../billing/tokenPolicy.js";
import { resolveAiTokens, resolveBillingStatusReason } from "../billing/resolveAiTokens.js";

assert.equal(resolveAiTokens({ subscriptionStatus: "active", planMonthlyAllowance: PAID_SUBSCRIPTION_TOKEN_GRANT }), PAID_SUBSCRIPTION_TOKEN_GRANT);
assert.equal(resolveAiTokens({ subscriptionStatus: "past_due", planMonthlyAllowance: PAID_SUBSCRIPTION_TOKEN_GRANT }), 0);
assert.equal(resolveAiTokens({ subscriptionStatus: "canceled", planMonthlyAllowance: PAID_SUBSCRIPTION_TOKEN_GRANT }), 0);
assert.equal(resolveAiTokens({ subscriptionStatus: null, planMonthlyAllowance: PAID_SUBSCRIPTION_TOKEN_GRANT }), 0);

assert.equal(resolveBillingStatusReason("trialing"), "active");
assert.equal(resolveBillingStatusReason("unpaid"), "past_due");
assert.equal(resolveBillingStatusReason("canceled"), "canceled");
assert.equal(resolveBillingStatusReason("incomplete_expired"), "expired");

console.log("resolveAiTokens tests passed");
