import { describe, expect, it } from "vitest";
import { getUiEntitlements, type AuthMePayload } from "@/lib/entitlements";

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
    }
  });
});
