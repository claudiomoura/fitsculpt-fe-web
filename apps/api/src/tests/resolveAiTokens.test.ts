import assert from "node:assert/strict";

import { resolveAiTokens, resolveBillingStatusReason } from "../billing/resolveAiTokens.js";

assert.equal(resolveAiTokens({ subscriptionStatus: "active", planMonthlyAllowance: 40000 }), 40000);
assert.equal(resolveAiTokens({ subscriptionStatus: "past_due", planMonthlyAllowance: 40000 }), 0);
assert.equal(resolveAiTokens({ subscriptionStatus: "canceled", planMonthlyAllowance: 40000 }), 0);
assert.equal(resolveAiTokens({ subscriptionStatus: null, planMonthlyAllowance: 40000 }), 0);

assert.equal(resolveBillingStatusReason("trialing"), "active");
assert.equal(resolveBillingStatusReason("unpaid"), "past_due");
assert.equal(resolveBillingStatusReason("canceled"), "canceled");
assert.equal(resolveBillingStatusReason("incomplete_expired"), "expired");

console.log("resolveAiTokens tests passed");
