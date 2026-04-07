import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/lib/profile";
import {
  getMockNavigation,
  renderWithProviders,
  resetMockNavigation,
  setMockPathname,
} from "@/test/utils/renderWithProviders";
import TrainingPlanClient from "@/app/(app)/app/entrenamiento/TrainingPlanClient";
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

vi.mock("@/lib/profileCompletion", () => ({
  isProfileComplete: () => true,
}));

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("AI generate billing routing", () => {
  beforeEach(() => {
    resetMockNavigation();
    window.__fsAnalyticsQueue = [];
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes training AI generate to billing for free users", async () => {
    setMockPathname("/app/entrenamiento");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") {
        return mockResponse({
          role: "user",
          gymId: "gym_1",
          gymName: "Gym",
          effectiveEntitlements: {
            modules: {
              ai: { enabled: false },
              strength: { enabled: false },
              nutrition: { enabled: false },
              billing: { enabled: true },
            },
            plan: { effective: "FREE" },
          },
        });
      }
      if (url === "/api/billing/status") return mockResponse({ plan: "FREE", status: "active" });
      if (url === "/api/ai/quota") return mockResponse({ tokens: 10 });
      if (url.startsWith("/api/training-plans/active")) {
        return mockResponse({
          source: "assigned",
          plan: {
            id: "plan-training",
            title: "Plan fuerza",
            startDate: "2026-01-01",
            days: [{ label: "Dia 1", focus: "Fuerza", duration: 45, date: "2026-01-01", exercises: [{ name: "Press banca", sets: "4", reps: "8" }] }],
          },
        });
      }
      if (url === "/api/workouts") return mockResponse([]);
      return mockResponse({});
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    renderWithProviders(<TrainingPlanClient />);

    fireEvent.click(await screen.findByRole("button", { name: /Generar con IA/i }));

    await waitFor(() => {
      expect(getMockNavigation().push).toHaveBeenCalledWith("/app/settings/billing?returnTo=%2Fapp%2Fentrenamiento");
    });

    expect(window.__fsAnalyticsQueue?.some((event) => event.name === "upgrade_started" && event.props?.target === "training")).toBe(true);
  });

  it("keeps training AI flow for entitled users", async () => {
    setMockPathname("/app/entrenamiento");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") {
        return mockResponse({
          role: "user",
          gymId: "gym_1",
          gymName: "Gym",
          effectiveEntitlements: {
            modules: {
              ai: { enabled: true },
              strength: { enabled: true },
              nutrition: { enabled: true },
              billing: { enabled: true },
            },
            plan: { effective: "PRO" },
          },
        });
      }
      if (url === "/api/billing/status") return mockResponse({ plan: "PRO", status: "active" });
      if (url === "/api/ai/quota") return mockResponse({ tokens: 10 });
      if (url.startsWith("/api/training-plans/active")) {
        return mockResponse({
          source: "assigned",
          plan: {
            id: "plan-training",
            title: "Plan fuerza",
            startDate: "2026-01-01",
            days: [{ label: "Dia 1", focus: "Fuerza", duration: 45, date: "2026-01-01", exercises: [{ name: "Press banca", sets: "4", reps: "8" }] }],
          },
        });
      }
      if (url === "/api/workouts") return mockResponse([]);
      return mockResponse({});
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    renderWithProviders(<TrainingPlanClient />);

    fireEvent.click(await screen.findByRole("button", { name: /Generar con IA/i }));

    await waitFor(() => {
      expect(getMockNavigation().push).not.toHaveBeenCalledWith(expect.stringContaining("/app/settings/billing"));
    });
  });

  it("routes nutrition AI generate to billing for free users", async () => {
    setMockPathname("/app/nutricion");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") {
        return mockResponse({
          role: "user",
          gymId: "gym_1",
          gymName: "Gym",
          effectiveEntitlements: {
            modules: {
              ai: { enabled: false },
              strength: { enabled: false },
              nutrition: { enabled: false },
              billing: { enabled: true },
            },
            plan: { effective: "FREE" },
          },
        });
      }
      if (url === "/api/billing/status") return mockResponse({ plan: "FREE", status: "active" });
      if (url === "/api/ai/quota") return mockResponse({ tokens: 10 });
      if (url === "/api/nutrition-plans/assigned") {
        return mockResponse({
          assignedPlan: {
            id: "plan-nutrition",
            title: "Plan semanal",
            startDate: "2026-01-01",
            dailyCalories: 2200,
            proteinG: 140,
            fatG: 70,
            carbsG: 260,
            days: [{ dayLabel: "Lunes", date: "2026-01-01", meals: [{ type: "breakfast", title: "Avena", ingredients: [], macros: { calories: 450, protein: 25, carbs: 50, fats: 15 } }] }],
          },
        });
      }
      if (url.startsWith("/api/recipes")) return mockResponse({ items: [] });
      return mockResponse({});
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    renderWithProviders(<NutritionPlanClient />);

    fireEvent.click(await screen.findByTestId("nutrition-generate-ai-card"));

    await waitFor(() => {
      expect(getMockNavigation().push).toHaveBeenCalledWith("/app/settings/billing?returnTo=%2Fapp%2Fnutricion");
    });

    expect(window.__fsAnalyticsQueue?.some((event) => event.name === "upgrade_started" && event.props?.target === "nutrition")).toBe(true);
  });

  it("keeps nutrition AI flow for entitled users", async () => {
    setMockPathname("/app/nutricion");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") {
        return mockResponse({
          role: "user",
          gymId: "gym_1",
          gymName: "Gym",
          effectiveEntitlements: {
            modules: {
              ai: { enabled: true },
              strength: { enabled: true },
              nutrition: { enabled: true },
              billing: { enabled: true },
            },
            plan: { effective: "PRO" },
          },
        });
      }
      if (url === "/api/billing/status") return mockResponse({ plan: "PRO", status: "active" });
      if (url === "/api/ai/quota") return mockResponse({ tokens: 10 });
      if (url === "/api/nutrition-plans/assigned") {
        return mockResponse({
          assignedPlan: {
            id: "plan-nutrition",
            title: "Plan semanal",
            startDate: "2026-01-01",
            dailyCalories: 2200,
            proteinG: 140,
            fatG: 70,
            carbsG: 260,
            days: [{ dayLabel: "Lunes", date: "2026-01-01", meals: [{ type: "breakfast", title: "Avena", ingredients: [], macros: { calories: 450, protein: 25, carbs: 50, fats: 15 } }] }],
          },
        });
      }
      if (url.startsWith("/api/recipes")) return mockResponse({ items: [] });
      return mockResponse({});
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    renderWithProviders(<NutritionPlanClient />);

    fireEvent.click(await screen.findByTestId("nutrition-generate-ai-card"));

    await waitFor(() => {
      expect(getMockNavigation().push).not.toHaveBeenCalledWith(expect.stringContaining("/app/settings/billing"));
    });
  });
});
