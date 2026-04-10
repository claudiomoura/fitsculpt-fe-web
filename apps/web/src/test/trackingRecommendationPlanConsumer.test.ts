import { describe, expect, it } from "vitest";
import { defaultProfile } from "@/lib/profile";
import type { TrackingRecommendationItem } from "@/domains/tracking-intelligence";
import { consumeTrackingRecommendationForAiPlan } from "@/domains/tracking-intelligence";

const trainingRecommendation: TrackingRecommendationItem = {
  id: "protect-recovery-bandwidth",
  title: "Protect recovery",
  summary: "Keep adjustments moderate this week.",
  rationale: ["Adherence is unstable"],
  confidence: "medium",
  sourceCapabilities: ["recommendation"],
  cta: {
    target: "training-plan",
    href: "/app/entrenamientos",
    label: "Review training",
  },
};

describe("tracking recommendation AI plan consumer", () => {
  it("skips recommendations that are not training-plan CTAs", async () => {
    const result = await consumeTrackingRecommendationForAiPlan({
      recommendation: {
        ...trainingRecommendation,
        cta: { ...trainingRecommendation.cta, target: "weekly-review" },
      },
      profile: defaultProfile,
      trainingPreferences: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_training_plan_cta");
    }
  });

  it("fails closed when token reservation adapter is missing", async () => {
    const result = await consumeTrackingRecommendationForAiPlan({
      recommendation: trainingRecommendation,
      profile: defaultProfile,
      trainingPreferences: {
        goal: "cut",
        level: "beginner",
        daysPerWeek: 3,
        equipment: "gym",
        focus: "full",
        sessionTime: "medium",
      },
      aiProfile: {
        subscriptionPlan: "PRO",
        aiTokenBalance: 10000,
        entitlements: { modules: { ai: { enabled: true } } },
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ai_preflight_failed");
      expect(result.failureReason).toBe("reservation_unavailable");
    }
  });
});
