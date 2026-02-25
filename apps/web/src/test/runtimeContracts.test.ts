import { describe, expect, it } from "vitest";
import {
  validateAiNutritionGeneratePayload,
  validateAiTrainingGeneratePayload,
  validateAuthMePayload,
  validateExerciseDetailPayload,
  validateExercisesListPayload,
  validateMembershipPayload,
  validateTrackingSnapshot,
} from "@/lib/runtimeContracts";

describe("runtimeContracts", () => {
  it("accepts valid auth/me shape", () => {
    expect(
      validateAuthMePayload({
        subscriptionPlan: "PRO",
        entitlements: {
          modules: {
            ai: { enabled: true },
            nutrition: { enabled: false },
            strength: { enabled: true },
          },
        },
      }).ok,
    ).toBe(true);
  });

  it("rejects invalid tracking snapshot shape", () => {
    expect(
      validateTrackingSnapshot({
        checkins: [{ id: "c1", date: "2026-02-20" }],
        foodLog: [],
        workoutLog: [],
      }).ok,
    ).toBe(false);
  });

  it("accepts exercises list with items", () => {
    expect(validateExercisesListPayload({ items: [{ id: "ex_1", name: "Push-up" }] }).ok).toBe(true);
  });

  it("accepts exercise detail minimal shape", () => {
    expect(validateExerciseDetailPayload({ id: "ex_2", name: "Squat" }).ok).toBe(true);
  });

  it("accepts membership normalized shape", () => {
    expect(validateMembershipPayload({ status: "ACTIVE", gymId: "gym_1", gymName: "Main", role: "member" }).ok).toBe(true);
  });

  it("rejects ai training when plan is missing", () => {
    expect(validateAiTrainingGeneratePayload({ aiTokenBalance: 1 }).ok).toBe(false);
  });

  it("accepts ai nutrition valid shape", () => {
    expect(validateAiNutritionGeneratePayload({ plan: {}, aiTokenBalance: 2, aiTokenRenewalAt: null }).ok).toBe(true);
  });
});
