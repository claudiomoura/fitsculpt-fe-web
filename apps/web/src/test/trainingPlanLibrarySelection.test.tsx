import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMockNavigation, renderWithProviders, resetMockNavigation, setMockPathname } from "@/test/utils/renderWithProviders";
import TrainingLibraryClient from "@/app/(app)/app/biblioteca/entrenamientos/TrainingLibraryClient";
import type { TrainingPlanListItem } from "@/lib/types";

function buildPlan(id: string, title: string, extra?: Record<string, unknown>): TrainingPlanListItem {
  return {
    id,
    title,
    goal: "strength",
    level: "intermedio",
    daysPerWeek: 4,
    focus: "full body",
    equipment: "gym",
    startDate: "2026-01-01",
    daysCount: 7,
    createdAt: "2026-01-01",
    ...extra,
  } as TrainingPlanListItem;
}

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("Training plan library selection flow", () => {
  beforeEach(() => {
    resetMockNavigation();
    setMockPathname("/app/biblioteca/planes-entrenamiento");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preselects from deep link and updates active selection when user chooses another plan", async () => {
    const assignedPlan = buildPlan("plan-assigned", "Plan asignado");
    const aiPlan = buildPlan("plan-ai", "Plan IA fuerza", { source: "ai" });
    const manualPlan = buildPlan("plan-manual", "Plan manual base");

    getMockNavigation().searchParams = new URLSearchParams("planId=plan-ai");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") return mockResponse({ role: "user", aiEntitlements: { strength: true } });
      if (url.startsWith("/api/training-plans/active")) return mockResponse({ source: "assigned", plan: assignedPlan });
      if (url.startsWith("/api/training-plans?")) return mockResponse({ items: [aiPlan, manualPlan] });
      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<TrainingLibraryClient />);

    await screen.findByTestId("training-active-plan-card");
    expect(screen.getByText("Plan IA fuerza")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Mis planes" }));
    await screen.findByTestId("training-plan-card-plan-manual");

    fireEvent.click(screen.getByTestId("training-select-plan-plan-manual"));

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/app/biblioteca/planes-entrenamiento?planId=plan-manual");
    });

  });

  it("updates selected plan when storage changes after AI save", async () => {
    const oldPlan = buildPlan("plan-old", "Plan anterior");
    const aiPlan = buildPlan("plan-new-ai", "Plan IA nuevo", { isAiGenerated: true });

    window.localStorage.setItem("fs_selected_plan_id", "plan-old");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") return mockResponse({ role: "user", aiEntitlements: { strength: true } });
      if (url.startsWith("/api/training-plans/active")) return mockResponse({ source: "own" });
      if (url.startsWith("/api/training-plans?")) return mockResponse({ items: [oldPlan, aiPlan] });
      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<TrainingLibraryClient />);

    await screen.findByTestId("training-active-plan-card");
    expect(screen.getByText("Plan anterior")).toBeInTheDocument();

    window.localStorage.setItem("fs_selected_plan_id", "plan-new-ai");
    window.dispatchEvent(new StorageEvent("storage", { key: "fs_selected_plan_id", newValue: "plan-new-ai" }));

    await waitFor(() => {
      expect(screen.getByText("Plan IA nuevo")).toBeInTheDocument();
    });
  });
});
