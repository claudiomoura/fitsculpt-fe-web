import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, resetMockNavigation, setMockPathname } from "@/test/utils/renderWithProviders";

const fetchMock = vi.fn();

vi.mock("@/hooks/useAuthEntitlements", () => ({
  useAuthEntitlements: () => ({
    entitlements: { status: "unknown" },
    authMe: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    invalidateCache: vi.fn(),
  }),
}));

vi.mock("@/components/quick-log/QuickLogHub", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/app/(app)/app/hoy/TodayEmptyState", () => ({
  TodayEmptyState: () => <div data-testid="today-empty-state" />,
}));

vi.mock("@/app/(app)/app/hoy/TodayErrorState", () => ({
  TodayErrorState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("@/app/(app)/app/hoy/TodaySkeleton", () => ({
  TodaySkeleton: () => <div data-testid="today-skeleton" />,
}));

vi.mock("@/app/(app)/app/hoy/components/TodayHeader", () => ({
  TodayHeader: () => <div data-testid="today-header" />,
}));

vi.mock("@/app/(app)/app/hoy/components/TodaySummaryCard", () => ({
  TodaySummaryCard: () => <div data-testid="today-summary-card" />,
}));

vi.mock("@/app/(app)/app/hoy/components/TodayViewTabs", () => ({
  TodayViewTabs: () => null,
}));

vi.mock("@/app/(app)/app/hoy/components/TodayPriorityHero", () => ({
  TodayPriorityHero: () => <div data-testid="today-priority-hero" />,
}));

vi.mock("@/app/(app)/app/hoy/components/TodayNutritionCard", () => ({
  TodayNutritionCard: () => <div data-testid="today-nutrition-card" />,
}));

vi.mock("@/app/(app)/app/hoy/components/TodayWeeklySummaryCard", () => ({
  TodayWeeklySummaryCard: () => <div data-testid="today-weekly-summary-card" />,
}));

import TodayQuickActionsClient from "@/app/(app)/app/hoy/TodayQuickActionsClient";

describe("TodayQuickActionsClient weekly coach CTA wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    resetMockNavigation();
    setMockPathname("/app/hoy");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wires the aggregated Today summary weekly coach due signal into the Today CTA", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        tracking: {
          ok: true,
          status: 200,
          data: {
            checkins: [
              { date: "2026-04-17", weightKg: 81.2 },
            ],
            mealLog: [],
          },
        },
        activeTraining: { ok: false, status: 404, data: null },
        nutritionList: { ok: false, status: 404, data: null },
        nutritionDetail: null,
        authMe: { ok: false, status: 401, data: null },
        profile: { ok: false, status: 404, data: null },
        weeklyCoach: {
          ok: true,
          status: 200,
          data: {
            loopState: "check_in_due",
            currentWeek: {
              planWeekId: "weekly_coach_2026-04-13",
              weekIndex: 16,
              state: "check_in_due",
              validFrom: "2026-04-13",
              validTo: "2026-04-19",
              weeklyObjective: "Stay consistent.",
              acceptedAt: null,
            },
            nextAction: "complete_weekly_check_in",
            checkInDue: true,
            planSummary: null,
            latestAdaptationSummary: null,
            featureFlags: {
              weeklyCoachEnabled: true,
              weeklyCheckInEnabled: true,
              adaptationEnabled: false,
            },
          },
        },
      }),
    });

    renderWithProviders(<TodayQuickActionsClient />);

    expect(
      await screen.findByRole("link", { name: /completar check-in semanal/i }),
    ).toHaveAttribute("href", "/app/hoy/weekly-review#weekly-coach-checkin");
    expect(screen.getByText(/check-in semanal pendiente/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/hoy/summary",
      expect.objectContaining({ cache: "no-store", credentials: "include" }),
    );
  });
});
