import { describe, expect, it, vi } from "vitest";

import { AiPlanRequestError, requestAiTrainingPlan } from "@/components/training-plan/aiPlanGeneration";

const profile = {
  name: "Test",
  age: 30,
  sex: "male",
  goals: [],
  injuries: "",
  notes: "",
  trainingPreferences: {
    includeCardio: false,
    includeMobilityWarmups: false,
    workoutLength: "medium",
    timerSound: true,
  },
} as any;

describe("requestAiTrainingPlan", () => {
  it("propagates backend 503 EXERCISE_CATALOG_UNAVAILABLE with hint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          error: "EXERCISE_CATALOG_UNAVAILABLE",
          hint: "Catálogo no disponible — ejecuta seed",
        }),
      }),
    );

    await expect(
      requestAiTrainingPlan(profile, {
        goal: "cut",
        level: "beginner",
        daysPerWeek: 3,
        equipment: "gym",
        focus: "full",
        sessionTime: "medium",
      }),
    ).rejects.toMatchObject({
      status: 503,
      code: "EXERCISE_CATALOG_UNAVAILABLE",
      hint: "Catálogo no disponible — ejecuta seed",
      message: "AI_GENERATION_FAILED",
    });
  });
});
