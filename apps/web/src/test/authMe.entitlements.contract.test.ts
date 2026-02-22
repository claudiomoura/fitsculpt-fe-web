import { describe, expect, it } from "vitest";
import { canAccessFeature, getUiEntitlements, type AuthMePayload } from "@/lib/entitlements";

describe("/auth/me entitlements contract (minimal)", () => {
  it("accepts payloads that expose entitlements object", () => {
    const payload: AuthMePayload = {
      plan: "PRO",
      entitlements: {
        modules: {
          ai: { enabled: true },
          strength: { enabled: true },
          nutrition: { enabled: true },
        },
      },
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

  it("returns unknown when backend modules are not present", () => {
    const payload: AuthMePayload = {
      plan: "PRO",
      entitlements: {
        plan: { effective: "PRO" },
      },
    };

    expect(getUiEntitlements(payload)).toEqual({ status: "unknown" });
  });
});
