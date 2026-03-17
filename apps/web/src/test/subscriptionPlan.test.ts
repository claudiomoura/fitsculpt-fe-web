import { describe, expect, it } from "vitest";
import {
  getPlanCapabilities,
  normalizeSubscriptionPlan,
  resolveSubscriptionPlan,
} from "@/lib/subscriptionPlan";

describe("subscription plan helper", () => {
  it("normalizes supported plan aliases", () => {
    expect(normalizeSubscriptionPlan("strength ai")).toBe("STRENGTH_AI");
    expect(normalizeSubscriptionPlan("nutriai")).toBe("NUTRI_AI");
    expect(normalizeSubscriptionPlan("pro")).toBe("PRO");
    expect(normalizeSubscriptionPlan("invalid_plan")).toBeNull();
  });

  it("resolves unknown values to FREE", () => {
    expect(resolveSubscriptionPlan("unknown")).toBe("FREE");
  });

  it("returns the expected capabilities for each real plan", () => {
    expect(getPlanCapabilities("FREE")).toEqual({ hasAI: false, hasStrengthAI: false, hasNutriAI: false });
    expect(getPlanCapabilities("STRENGTH_AI")).toEqual({ hasAI: true, hasStrengthAI: true, hasNutriAI: false });
    expect(getPlanCapabilities("NUTRI_AI")).toEqual({ hasAI: true, hasStrengthAI: false, hasNutriAI: true });
    expect(getPlanCapabilities("PRO")).toEqual({ hasAI: true, hasStrengthAI: true, hasNutriAI: true });
  });
});
