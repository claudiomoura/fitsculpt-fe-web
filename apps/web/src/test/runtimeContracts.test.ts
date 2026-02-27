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
        gymMembershipState: "ACTIVE",
        gymRole: "TRAINER",
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

  it("accepts optional AI usage fields", () => {
    expect(
      validateAiNutritionGeneratePayload({
        plan: {},
        usage: { total_tokens: 123, prompt_tokens: 45, completion_tokens: 78 },
        mode: "AI",
        aiRequestId: "req_123",
      }).ok,
    ).toBe(true);
  });

  it("rejects invalid AI usage fields", () => {
    expect(validateAiNutritionGeneratePayload({ plan: {}, usage: { total_tokens: "123" } }).ok).toBe(false);
  });
});


describe("runtimeContracts auth/me gym fields", () => {
  it("rejects invalid gym role", () => {
    expect(validateAuthMePayload({ gymRole: "MEMBER" }).ok).toBe(false);
  });
});
