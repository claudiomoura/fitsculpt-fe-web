import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMockNavigation, renderWithProviders, resetMockNavigation, setMockPathname } from "@/test/utils/renderWithProviders";
import DietPlansClient from "@/app/(app)/app/dietas/DietPlansClient";
import type { NutritionPlanListItem } from "@/lib/types";

function buildPlan(id: string, title: string, extra?: Record<string, unknown>): NutritionPlanListItem {
  return {
    id,
    title,
    dailyCalories: 2100,
    proteinG: 140,
    fatG: 70,
    carbsG: 220,
    startDate: "2026-01-01",
    daysCount: 7,
    createdAt: "2026-01-01",
    ...extra,
  } as NutritionPlanListItem;
}

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("Nutrition plan library selection flow", () => {
  beforeEach(() => {
    resetMockNavigation();
    setMockPathname("/app/biblioteca/planes-nutricion");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preselects from deep link and keeps assigned plan as reference", async () => {
    const assignedPlan = buildPlan("plan-assigned", "Plan del entrenador");
    const aiPlan = buildPlan("plan-ai", "Plan IA recomposición", { source: "ai" });
    const manualPlan = buildPlan("plan-manual", "Plan manual semanal");

    getMockNavigation().searchParams = new URLSearchParams("planId=plan-ai");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/nutrition-plans/assigned")) return mockResponse({ assignedPlan });
      if (url.startsWith("/api/nutrition-plans?")) return mockResponse({ items: [aiPlan, manualPlan] });
      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<DietPlansClient />);

    await screen.findByTestId("nutrition-active-plan-card");
    expect(screen.getByText("Plan IA recomposición")).toBeInTheDocument();
    expect(screen.getByText("Plan asignado por entrenador (referencia)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Mis planes" }));
    await screen.findByTestId("nutrition-plan-card-plan-manual");

    fireEvent.click(screen.getByTestId("nutrition-select-active-plan-manual"));

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/app/biblioteca/planes-nutricion?planId=plan-manual", { scroll: false });
    });
  });

  it("updates selection reactively when storage changes", async () => {
    const oldPlan = buildPlan("plan-old", "Plan actual");
    const nextPlan = buildPlan("plan-new", "Plan nuevo biblioteca", { isAiGenerated: true });

    window.localStorage.setItem("fs_active_nutrition_plan_id", "plan-old");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/nutrition-plans/assigned")) return mockResponse({ assignedPlan: null });
      if (url.startsWith("/api/nutrition-plans?")) return mockResponse({ items: [oldPlan, nextPlan] });
      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<DietPlansClient />);

    await screen.findByTestId("nutrition-active-plan-card");
    expect(screen.getByText("Plan actual")).toBeInTheDocument();

    window.localStorage.setItem("fs_active_nutrition_plan_id", "plan-new");
    window.dispatchEvent(new StorageEvent("storage", { key: "fs_active_nutrition_plan_id", newValue: "plan-new" }));

    await waitFor(() => {
      expect(screen.getByText("Plan nuevo biblioteca")).toBeInTheDocument();
    });
  });
});
