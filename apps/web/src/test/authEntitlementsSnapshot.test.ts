import { describe, expect, it } from "vitest";
import { readAuthEntitlementSnapshot } from "@/context/auth/entitlements";
import { getUiEntitlements } from "@/lib/entitlements";

describe("auth entitlement snapshot", () => {
  it("prefers backend aiEntitlements + tokenBalance fields", () => {
    const snapshot = readAuthEntitlementSnapshot({
      subscriptionPlan: "PRO",
      aiEntitlements: {
        nutrition: true,
        strength: false,
      },
      tokenBalance: 19,
    });

    expect(snapshot.subscriptionPlan).toBe("PRO");
    expect(snapshot.aiEntitlements).toMatchObject({ nutrition: true, strength: false });
    expect(snapshot.aiEntitlements.ai).toBe(true);
    expect(snapshot.tokenBalance).toBe(19);
  });

  it("falls back to nested entitlements when top-level fields are missing", () => {
    const snapshot = readAuthEntitlementSnapshot({
      entitlements: {
        plan: { effective: "NUTRI_AI" },
        modules: {
          nutrition: { enabled: true },
          strength: { enabled: false },
        },
      },
      aiTokenBalance: 3,
    });

    expect(snapshot.subscriptionPlan).toBe("NUTRI_AI");
    expect(snapshot.aiEntitlements).toMatchObject({ nutrition: true, strength: false });
    expect(snapshot.aiEntitlements.ai).toBe(true);
    expect(snapshot.tokenBalance).toBe(3);
  });

  it("maps snapshot to UI gating state", () => {
    const ui = getUiEntitlements({
      subscriptionPlan: "STRENGTH_AI",
      aiEntitlements: { nutrition: false, strength: true },
      tokenBalance: 4,
    });

    expect(ui).toEqual({
      status: "known",
      features: {
        canUseAI: true,
        canUseNutrition: false,
        canUseStrength: true,
      },
    });
  });
});
