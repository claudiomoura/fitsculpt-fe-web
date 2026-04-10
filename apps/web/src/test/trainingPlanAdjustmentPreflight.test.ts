import { describe, expect, it } from "vitest";
import { defaultProfile } from "@/lib/profile";
import { generateAndSaveTrainingPlan } from "@/lib/trainingPlanAdjustment";

describe("training plan adjustment AI preflight", () => {
  it("blocks execution when reservation adapter is unavailable", async () => {
    await expect(
      generateAndSaveTrainingPlan(
        defaultProfile,
        {
          goal: "cut",
          level: "beginner",
          daysPerWeek: 3,
          equipment: "gym",
          focus: "full",
          sessionTime: "medium",
        },
        {
          aiProfile: {
            subscriptionPlan: "PRO",
            aiTokenBalance: 15000,
            entitlements: { modules: { ai: { enabled: true } } },
          },
        },
      ),
    ).rejects.toThrow("reservation_unavailable");
  });
});
