import { describe, expect, it } from "vitest";
import { canAccessFeature, getUiEntitlements, type AuthMePayload } from "@/lib/entitlements";

describe("/auth/me entitlements contract (minimal)", () => {
  it("accepts payloads that expose entitlements modules from backend", () => {
    const payload: AuthMePayload = {
      subscriptionPlan: "PRO",
      entitlements: {
        modules: {
          ai: { enabled: true },
          nutrition: { enabled: true },
          strength: { enabled: true },
        },
      },
      tokenBalance: 500,
    };

    expect(payload).toHaveProperty("entitlements");
    expect(payload.entitlements).toBeTypeOf("object");

    const result = getUiEntitlements(payload);
    expect(result.status).toBe("known");
    if (result.status === "known") {
      expect(result.features.canUseAI).toBe(true);
      expect(result.features.canUseNutrition).toBe(true);
      expect(result.features.canUseStrength).toBe(true);
      expect(canAccessFeature(result, "nutrition")).toBe(true);
    }
  });

  it("keeps AI disabled when module entitlement is not present", () => {
    const payload: AuthMePayload = {
      subscriptionPlan: "PRO",
    };

    expect(getUiEntitlements(payload)).toEqual({
      status: "known",
      features: {
        canUseAI: false,
        canUseNutrition: false,
        canUseStrength: false,
      },
    });
  });
});
