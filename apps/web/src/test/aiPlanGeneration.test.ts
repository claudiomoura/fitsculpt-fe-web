import { describe, expect, it, vi } from "vitest";

import { requestAiTrainingPlan } from "@/components/training-plan/aiPlanGeneration";
import { defaultProfile } from "@/lib/profile";

const profile: Parameters<typeof requestAiTrainingPlan>[0] = {
  ...defaultProfile,
  name: "Test",
  age: 30,
  sex: "male",
  goals: [],
  injuries: "",
  notes: "",
  trainingPreferences: {
    ...defaultProfile.trainingPreferences,
    includeCardio: false,
    includeMobilityWarmups: false,
    workoutLength: "45m",
    timerSound: "ding",
  },
};

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

  it("parses fallback usage and mode from backend payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: {
            days: [
              {
                label: "Día 1",
                focus: "Fuerza",
                duration: 45,
                exercises: [{ name: "Sentadilla", sets: 4, reps: "8" }],
              },
            ],
          },
          mode: "FALLBACK",
          usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
          costCents: 0,
          costEur: 0,
          balanceBefore: 44444,
          aiTokenBalance: 44444,
          balanceAfter: 44444,
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
    ).resolves.toMatchObject({
      mode: "FALLBACK",
      usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
      costCents: 0,
      costEur: 0,
      balanceBefore: 44444,
      aiTokenBalance: 44444,
      balanceAfter: 44444,
    });
  });
});
