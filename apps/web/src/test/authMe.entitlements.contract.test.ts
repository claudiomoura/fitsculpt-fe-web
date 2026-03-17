import { describe, expect, it } from "vitest";
import { canAccessFeature, getUiEntitlements, type AuthMePayload } from "@/lib/entitlements";

describe("/auth/me entitlements contract (minimal)", () => {
  it("accepts payloads that expose entitlements modules from backend", () => {
    const payload: AuthMePayload = {
      subscriptionPlan: "PRO",
      effectiveEntitlements: {
        modules: {
          ai: { enabled: true },
          nutrition: { enabled: true },
          strength: { enabled: true },
        },
      },
      tokenBalance: 500,
    };

    expect(payload).toHaveProperty("effectiveEntitlements");
    expect(payload.effectiveEntitlements).toBeTypeOf("object");

    const result = getUiEntitlements(payload);
    expect(result.status).toBe("known");
    if (result.status === "known") {
      expect(result.features.canUseAI).toBe(true);
      expect(result.features.canUseNutrition).toBe(true);
      expect(result.features.canUseStrength).toBe(true);
      expect(result.features.canUseBilling).toBe(true);
      expect(canAccessFeature(result, "nutrition")).toBe(true);
    }
  });

  it("does not grant module access from plan name alone", () => {
    const payload: AuthMePayload = {
      subscriptionPlan: "PRO",
    };

    expect(getUiEntitlements(payload)).toEqual({
      status: "known",
      features: {
        canUseAI: false,
        canUseNutrition: false,
        canUseStrength: false,
        canUseBilling: true,
      },
    });
  });
});
