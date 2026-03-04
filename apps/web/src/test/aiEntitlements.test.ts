import { describe, expect, it } from "vitest";
import { hasAiEntitlement, hasNutritionAiEntitlement, hasStrengthAiEntitlement } from "@/components/access/aiEntitlements";

describe("ai entitlements by real subscription plans", () => {
  it("does not allow StrengthAI surface on FREE", () => {
    expect(hasStrengthAiEntitlement({ subscriptionPlan: "FREE" })).toBe(false);
  });

  it("allows StrengthAI surface on STRENGTH_AI", () => {
    expect(hasStrengthAiEntitlement({ subscriptionPlan: "STRENGTH_AI" })).toBe(true);
  });

  it("does not allow NutriAI surface on FREE", () => {
    expect(hasNutritionAiEntitlement({ subscriptionPlan: "FREE" })).toBe(false);
  });

  it("allows NutriAI surface on NUTRI_AI", () => {
    expect(hasNutritionAiEntitlement({ subscriptionPlan: "NUTRI_AI" })).toBe(true);
  });

  it("allows generic AI only on paid AI plans", () => {
    expect(hasAiEntitlement({ subscriptionPlan: "FREE" })).toBe(false);
    expect(hasAiEntitlement({ subscriptionPlan: "PRO" })).toBe(true);
  });
});
