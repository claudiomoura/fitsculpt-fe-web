import { describe, expect, it } from "vitest";
import { hasAiEntitlement, hasNutritionAiEntitlement, hasStrengthAiEntitlement } from "@/components/access/aiEntitlements";

describe("ai entitlements by module", () => {
  it("allows StrengthAI surface with strength module", () => {
    expect(
      hasStrengthAiEntitlement({
        entitlements: { modules: { strength: { enabled: true } } },
      }),
    ).toBe(true);
  });

  it("allows NutriAI surface with nutrition module", () => {
    expect(
      hasNutritionAiEntitlement({
        entitlements: { modules: { nutrition: { enabled: true } } },
      }),
    ).toBe(true);
  });

  it("allows both surfaces with ai/pro module", () => {
    const profile = { entitlements: { modules: { ai: { enabled: true } } } };

    expect(hasStrengthAiEntitlement(profile)).toBe(true);
    expect(hasNutritionAiEntitlement(profile)).toBe(true);
    expect(hasAiEntitlement(profile)).toBe(true);
  });
});
