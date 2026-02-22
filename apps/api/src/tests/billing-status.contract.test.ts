import assert from "node:assert/strict";
import { z } from "zod";

const billingStatusSchema = z.object({
  plan: z.enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"]),
  isPaid: z.boolean(),
  isPro: z.boolean(),
  tokens: z.number(),
  tokensExpiresAt: z.string().nullable(),
  subscriptionStatus: z.string().nullable(),
  availablePlans: z.array(z.enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"])),
});

const activeProPayload = {
  plan: "PRO",
  isPaid: true,
  isPro: true,
  tokens: 420,
  tokensExpiresAt: "2026-03-01T00:00:00.000Z",
  subscriptionStatus: "ACTIVE",
  availablePlans: ["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"],
};

const fallbackFreePayload = {
  plan: "FREE",
  isPaid: false,
  isPro: false,
  tokens: 0,
  tokensExpiresAt: null,
  subscriptionStatus: null,
  availablePlans: ["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"],
};

const parsedActive = billingStatusSchema.parse(activeProPayload);
const parsedFallback = billingStatusSchema.parse(fallbackFreePayload);

assert.equal(parsedActive.plan, "PRO");
assert.equal(parsedActive.isPaid, true);
assert.equal(parsedFallback.plan, "FREE");
assert.equal(parsedFallback.isPaid, false);

assert.throws(() =>
  billingStatusSchema.parse({
    plan: "PRO",
    isPaid: true,
    isPro: true,
    tokensBalance: 420,
    tokensExpiresAt: "2026-03-01T00:00:00.000Z",
    subscriptionStatus: "ACTIVE",
    availablePlans: ["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"],
  })
);

console.log("billing status contract test passed");
