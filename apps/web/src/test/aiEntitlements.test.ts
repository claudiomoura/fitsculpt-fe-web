import { describe, expect, it } from "vitest";
import { hasAiEntitlement, hasNutritionAiEntitlement, hasStrengthAiEntitlement } from "@/components/access/aiEntitlements";

describe("ai entitlements by real subscription plans", () => {
  it("does not allow StrengthAI surface without backend module", () => {
    expect(hasStrengthAiEntitlement({ subscriptionPlan: "FREE" })).toBe(false);
  });

  it("allows StrengthAI surface from backend module", () => {
    expect(hasStrengthAiEntitlement({ effectiveEntitlements: { modules: { strength: { enabled: true } } } })).toBe(true);
  });

  it("does not allow NutriAI surface without backend module", () => {
    expect(hasNutritionAiEntitlement({ subscriptionPlan: "FREE" })).toBe(false);
  });

  it("allows NutriAI surface from backend module", () => {
    expect(hasNutritionAiEntitlement({ effectiveEntitlements: { modules: { nutrition: { enabled: true } } } })).toBe(true);
  });

  it("allows generic AI only from backend module", () => {
    expect(hasAiEntitlement({ subscriptionPlan: "FREE" })).toBe(false);
    expect(hasAiEntitlement({ effectiveEntitlements: { modules: { ai: { enabled: true } } } })).toBe(true);
  });
});
