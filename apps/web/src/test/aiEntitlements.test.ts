import { describe, expect, it } from "vitest";
import { hasAiEntitlement, hasNutritionAiEntitlement, hasStrengthAiEntitlement } from "@/components/access/aiEntitlements";

describe("ai entitlements by module", () => {
  it("does not allow StrengthAI surface with ai/pro module only", () => {
    expect(
      hasStrengthAiEntitlement({
        entitlements: { modules: { ai: { enabled: true } } },
      }),
    ).toBe(false);
  });

  it("allows StrengthAI surface with strength module", () => {
    expect(
      hasStrengthAiEntitlement({
        entitlements: { modules: { strength: { enabled: true } } },
      }),
    ).toBe(true);
  });

  it("does not allow NutriAI surface with ai/pro module only", () => {
    expect(
      hasNutritionAiEntitlement({
        entitlements: { modules: { ai: { enabled: true } } },
      }),
    ).toBe(false);
  });

  it("allows NutriAI surface with nutrition module", () => {
    expect(
      hasNutritionAiEntitlement({
        entitlements: { modules: { nutrition: { enabled: true } } },
      }),
    ).toBe(true);
  });

  it("allows generic AI only when at least one domain module is enabled", () => {
    const profile = { entitlements: { modules: { strength: { enabled: true } } } };

    expect(hasStrengthAiEntitlement(profile)).toBe(true);
    expect(hasNutritionAiEntitlement(profile)).toBe(false);
    expect(hasAiEntitlement(profile)).toBe(true);
  });
});
