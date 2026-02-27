import { describe, expect, it } from "vitest";
import { canAccessFeature, getUiEntitlements, type AuthMePayload } from "@/lib/entitlements";

describe("/auth/me entitlements contract (minimal)", () => {
  it("accepts payloads that expose aiEntitlements object", () => {
    const payload: AuthMePayload = {
      subscriptionPlan: "PRO",
      aiEntitlements: {
        nutrition: true,
        strength: true,
      },
      tokenBalance: 500,
    };

    expect(payload).toHaveProperty("aiEntitlements");
    expect(payload.aiEntitlements).toBeTypeOf("object");

    const result = getUiEntitlements(payload);
    expect(result.status).toBe("known");
    if (result.status === "known") {
      expect(result.features.canUseAI).toBe(true);
      expect(result.features.canUseNutrition).toBe(true);
      expect(result.features.canUseStrength).toBe(true);
      expect(canAccessFeature(result, "nutrition")).toBe(true);
    }
  });

  it("returns unknown when backend aiEntitlements are not present", () => {
    const payload: AuthMePayload = {
      subscriptionPlan: "PRO",
    };

    expect(getUiEntitlements(payload)).toEqual({ status: "unknown" });
  });
});
