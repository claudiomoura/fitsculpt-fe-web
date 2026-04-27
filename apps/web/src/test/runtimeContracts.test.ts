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

const validNutritionPlan = {
  title: "Plan semanal",
  startDate: "2026-01-01",
  dailyCalories: 2200,
  proteinG: 140,
  fatG: 70,
  carbsG: 250,
  days: [
    {
      date: "2026-01-01",
      dayLabel: "Lunes",
      meals: [
        {
          type: "breakfast",
          recipeId: null,
          title: "Avena con fruta",
          description: null,
          macros: {
            calories: 450,
            protein: 25,
            carbs: 60,
            fats: 12,
          },
          ingredients: [{ name: "Avena", grams: 60 }],
        },
      ],
    },
  ],
  shoppingList: [{ name: "Avena", grams: 420 }],
} as const;

describe("runtimeContracts", () => {
  it("accepts valid auth/me shape", () => {
    expect(
      validateAuthMePayload({
        subscriptionPlan: "PRO",
        tokenBalance: 120,
        aiEntitlements: { nutrition: true, strength: true },
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
        mealLog: [],
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
    expect(
      validateAiNutritionGeneratePayload({
        plan: validNutritionPlan,
        aiTokenBalance: 2,
        aiTokenRenewalAt: null,
      }).ok,
    ).toBe(true);
  });

  it("accepts optional AI usage fields", () => {
    expect(
      validateAiNutritionGeneratePayload({
        plan: validNutritionPlan,
        usage: { total_tokens: 123, prompt_tokens: 45, completion_tokens: 78 },
        mode: "AI",
        aiRequestId: "123e4567-e89b-42d3-a456-426614174000",
      }).ok,
    ).toBe(true);
  });

  it("rejects invalid AI usage fields", () => {
    expect(
      validateAiNutritionGeneratePayload({
        plan: validNutritionPlan,
        usage: { total_tokens: "123" },
      }).ok,
    ).toBe(false);
  });

  it("rejects nutrition plan missing required fields", () => {
    expect(validateAiNutritionGeneratePayload({ plan: { title: "x" } }).ok).toBe(
      false,
    );
  });

  it("rejects invalid aiRequestId format", () => {
    expect(validateAiTrainingGeneratePayload({ plan: {}, aiRequestId: "req_123" }).ok).toBe(false);
    expect(
      validateAiNutritionGeneratePayload({
        plan: validNutritionPlan,
        aiRequestId: "req_123",
      }).ok,
    ).toBe(false);
  });
});


describe("runtimeContracts auth/me gym fields", () => {
  it("rejects invalid gym role", () => {
    expect(validateAuthMePayload({ gymRole: "MEMBER" }).ok).toBe(false);
  });
});


describe("runtimeContracts auth/me ai fields", () => {
  it("rejects invalid aiEntitlements", () => {
    expect(validateAuthMePayload({ aiEntitlements: { nutrition: "yes" } }).ok).toBe(false);
  });
});
