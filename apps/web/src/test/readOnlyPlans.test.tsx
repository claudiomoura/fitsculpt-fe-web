import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/lib/profile";
import { renderWithProviders, resetMockNavigation } from "@/test/utils/renderWithProviders";

const completeProfile = {
  ...defaultProfile,
  sex: "male" as const,
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: "moderate" as const,
  goal: "maintain" as const,
  trainingPreferences: {
    ...defaultProfile.trainingPreferences,
    level: "intermediate" as const,
    daysPerWeek: 4,
    sessionTime: "medium" as const,
    focus: "full" as const,
    equipment: "gym" as const,
  },
  nutritionPreferences: {
    ...defaultProfile.nutritionPreferences,
    mealsPerDay: 4,
    dietType: "balanced" as const,
    cookingTime: "medium" as const,
    mealDistribution: { preset: "balanced" as const },
  },
};

vi.mock("@/lib/profileService", () => ({
  getUserProfile: () => Promise.resolve(completeProfile),
}));

import TrainingPlanClient from "@/app/(app)/app/entrenamiento/TrainingPlanClient";
import NutritionPlanClient from "@/app/(app)/app/nutricion/NutritionPlanClient";
import MacrosClient from "@/app/(app)/app/macros/MacrosClient";

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe("Read-only plan pages", () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("renders training plan without editable form fields", async () => {
    resetMockNavigation();
    const { container, findByText } = renderWithProviders(<TrainingPlanClient />);
    await findByText(/Aún no tienes un plan de entrenamiento activo|Datos del plan/i);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });

  it("renders nutrition plan without editable form fields", async () => {
    resetMockNavigation();
    const { container, findByText } = renderWithProviders(<NutritionPlanClient />);
    await findByText(/Aún no tienes plan|Datos del plan/i);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });

  it("renders macros without editable form fields", async () => {
    resetMockNavigation();
    const { container, findByText } = renderWithProviders(<MacrosClient />);
    await findByText(/Macros/i);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });
});
