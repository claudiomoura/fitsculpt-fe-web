import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/lib/profile";
import { getMockNavigation, renderWithProviders, resetMockNavigation, setMockPathname } from "@/test/utils/renderWithProviders";
import NutritionPlanClient from "@/app/(app)/app/nutrition/NutritionPlanClient";

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
  updateUserProfile: vi.fn(),
}));

function createPlanPayload(title: string) {
  return {
    title,
    startDate: "2026-01-01",
    dailyCalories: 2200,
    proteinG: 140,
    fatG: 70,
    carbsG: 260,
    days: [
      {
        dayLabel: "Lunes",
        date: "2026-01-01",
        meals: [],
      },
    ],
  };
}

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("Nutrition selection propagation", () => {
  beforeEach(() => {
    resetMockNavigation();
    setMockPathname("/app/nutricion");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses library selection from storage as source of truth on /app/nutricion", async () => {
    window.localStorage.setItem("fs_active_nutrition_plan_id", "plan-library");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") return mockResponse({ role: "user", aiEntitlements: { nutrition: true } });
      if (url === "/api/nutrition-plans/assigned") return mockResponse({ assignedPlan: createPlanPayload("Plan entrenador") });
      if (url === "/api/nutrition-plans/plan-library") return mockResponse(createPlanPayload("Plan biblioteca activo"));
      if (url === "/api/billing/status") return mockResponse({ plan: "FREE", status: "active" });
      if (url === "/api/ai/quota") return mockResponse({ tokens: 10 });
      if (url.startsWith("/api/recipes")) return mockResponse({ items: [] });
      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<NutritionPlanClient />);

    const selectedTitleMatches = await screen.findAllByText("Plan biblioteca activo");
    expect(selectedTitleMatches.length).toBeGreaterThan(0);
    expect(screen.getByText(/Seleccionado de la biblioteca/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/app/nutricion?planId=plan-library", { scroll: false });
    });
  });

  it("clears stale selected plan and falls back to trainer-assigned reference", async () => {
    window.localStorage.setItem("fs_active_nutrition_plan_id", "plan-stale");
    getMockNavigation().searchParams = new URLSearchParams("planId=plan-stale");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") return mockResponse({ role: "user", aiEntitlements: { nutrition: true } });
      if (url === "/api/nutrition-plans/assigned") return mockResponse({ assignedPlan: createPlanPayload("Plan trainer fallback") });
      if (url === "/api/nutrition-plans/plan-stale") return mockResponse({ code: "PLAN_NOT_FOUND" }, 404);
      if (url === "/api/billing/status") return mockResponse({ plan: "FREE", status: "active" });
      if (url === "/api/ai/quota") return mockResponse({ tokens: 10 });
      if (url.startsWith("/api/recipes")) return mockResponse({ items: [] });
      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<NutritionPlanClient />);

    const trainerTitleMatches = await screen.findAllByText("Plan trainer fallback");
    expect(trainerTitleMatches.length).toBeGreaterThan(0);
    expect(screen.getByText("Asignado por tu entrenador")).toBeInTheDocument();

    await waitFor(() => {
      expect(window.localStorage.getItem("fs_active_nutrition_plan_id")).toBeNull();
    });

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/app/nutricion", { scroll: false });
    });
  });
});
