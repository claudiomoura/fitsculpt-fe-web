import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import WeeklyReviewClient from "@/components/weekly-review/WeeklyReviewClient";

const useWeeklyReviewMock = vi.fn();
const submitWeeklyReviewDecisionMock = vi.fn();
const trackWeeklyReviewEventMock = vi.fn();

vi.mock("@/lib/useWeeklyReview", () => ({
  useWeeklyReview: () => useWeeklyReviewMock(),
}));

vi.mock("@/services/weeklyReview", () => ({
  submitWeeklyReviewDecision: (...args: unknown[]) => submitWeeklyReviewDecisionMock(...args),
}));

vi.mock("@/lib/weeklyReviewTelemetry", () => ({
  trackWeeklyReviewEvent: (...args: unknown[]) => trackWeeklyReviewEventMock(...args),
}));

function renderClient() {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <WeeklyReviewClient />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("WeeklyReviewClient", () => {
  beforeEach(() => {
    useWeeklyReviewMock.mockReset();
    submitWeeklyReviewDecisionMock.mockReset();
    trackWeeklyReviewEventMock.mockReset();
  });

  it("renders explainable recommendation cards", () => {
    useWeeklyReviewMock.mockReturnValue({
      data: {
        summary: {
          weekKey: "2026-02-16",
          rangeStart: "2026-02-16",
          rangeEnd: "2026-02-22",
          previousRangeStart: "2026-02-09",
          previousRangeEnd: "2026-02-15",
          generatedAt: "2026-02-23T10:00:00.000Z",
          days: 7,
          checkinsCount: 2,
          workoutsCount: 1,
          previousWorkoutsCount: 3,
          nutritionLogsCount: 3,
          mealLoggingDays: 3,
          trainingTargetSessions: 4,
          trainingAdherencePct: 25,
          manualTrainingAdherencePct: 25,
          passiveAdherenceSupportPct: 12,
          passiveActiveDays: 4,
          passiveStepsTotal: 43210,
          passiveActiveMinutes: 96,
          passiveSourceCount: 1,
          averageEnergy: 2.5,
          averageHunger: 4,
          averageSleepHours: 7.4,
          averageRestingHeartRate: 60,
          weightChangeKg: -1.2,
          weightChangePct: -1.5,
          waistChangeCm: -1,
        },
        recommendations: [
          {
            id: "training-deload",
            type: "training",
            title: "Bajar exigencia para recuperar consistencia",
            recommendation: "Sugerimos simplificar la semana y reducir el volumen un 10%.",
            why: "Completaste 1/4 sesiones.",
            reasoning: ["La adherencia cayo por debajo del 50%.", "Reducir un 10% baja friccion sin tocar toda la estructura."],
            direction: "decrease",
            adjustmentPct: 10,
            decision: "pending",
            metrics: [{ label: "Adherencia", value: "25%" }],
            safetyNotes: ["El ajuste esta limitado al 10%."],
          },
        ],
      },
      loading: false,
      error: null,
      notSupported: false,
      reload: vi.fn(),
    });

    renderClient();

    expect(screen.getByText(/adaptive engine v1/i)).toBeInTheDocument();
    expect(screen.getByText(/bajar exigencia para recuperar consistencia/i)).toBeInTheDocument();
    expect(screen.getByText(/lectura profesional/i)).toBeInTheDocument();
    expect(screen.getByText(/la adherencia mostrada combina tu registro manual/i)).toBeInTheDocument();
    expect(trackWeeklyReviewEventMock).toHaveBeenCalledWith(expect.objectContaining({ event: "weekly_review_opened", weekKey: "2026-02-16" }));
    expect(trackWeeklyReviewEventMock).toHaveBeenCalledWith(expect.objectContaining({ event: "recommendation_seen", recommendationId: "training-deload" }));
  });

  it("persists accept decisions and updates status", async () => {
    useWeeklyReviewMock.mockReturnValue({
      data: {
        summary: {
          weekKey: "2026-02-16",
          rangeStart: "2026-02-16",
          rangeEnd: "2026-02-22",
          previousRangeStart: "2026-02-09",
          previousRangeEnd: "2026-02-15",
          generatedAt: "2026-02-23T10:00:00.000Z",
          days: 7,
          checkinsCount: 2,
          workoutsCount: 1,
          previousWorkoutsCount: 3,
          nutritionLogsCount: 3,
          mealLoggingDays: 3,
          trainingTargetSessions: 4,
          trainingAdherencePct: 25,
          manualTrainingAdherencePct: 25,
          passiveAdherenceSupportPct: 12,
          passiveActiveDays: 4,
          passiveStepsTotal: 43210,
          passiveActiveMinutes: 96,
          passiveSourceCount: 1,
          averageEnergy: 2.5,
          averageHunger: 4,
          averageSleepHours: 7.4,
          averageRestingHeartRate: 60,
          weightChangeKg: -1.2,
          weightChangePct: -1.5,
          waistChangeCm: -1,
        },
        recommendations: [
          {
            id: "training-deload",
            type: "training",
            title: "Bajar exigencia para recuperar consistencia",
            recommendation: "Sugerimos simplificar la semana y reducir el volumen un 10%.",
            why: "Completaste 1/4 sesiones.",
            reasoning: ["La adherencia cayo por debajo del 50%."],
            direction: "decrease",
            adjustmentPct: 10,
            decision: "pending",
            metrics: [{ label: "Adherencia", value: "25%" }],
            safetyNotes: ["El ajuste esta limitado al 10%."],
          },
        ],
      },
      loading: false,
      error: null,
      notSupported: false,
      reload: vi.fn(),
    });

    submitWeeklyReviewDecisionMock.mockResolvedValue({
      ok: true,
      data: {
        summary: {
          weekKey: "2026-02-16",
          rangeStart: "2026-02-16",
          rangeEnd: "2026-02-22",
          previousRangeStart: "2026-02-09",
          previousRangeEnd: "2026-02-15",
          generatedAt: "2026-02-23T10:00:00.000Z",
          days: 7,
          checkinsCount: 2,
          workoutsCount: 1,
          previousWorkoutsCount: 3,
          nutritionLogsCount: 3,
          mealLoggingDays: 3,
          trainingTargetSessions: 4,
          trainingAdherencePct: 25,
          manualTrainingAdherencePct: 25,
          passiveAdherenceSupportPct: 12,
          passiveActiveDays: 4,
          passiveStepsTotal: 43210,
          passiveActiveMinutes: 96,
          passiveSourceCount: 1,
          averageEnergy: 2.5,
          averageHunger: 4,
          averageSleepHours: 7.4,
          averageRestingHeartRate: 60,
          weightChangeKg: -1.2,
          weightChangePct: -1.5,
          waistChangeCm: -1,
        },
        recommendations: [
          {
            id: "training-deload",
            type: "training",
            title: "Bajar exigencia para recuperar consistencia",
            recommendation: "Sugerimos simplificar la semana y reducir el volumen un 10%.",
            why: "Completaste 1/4 sesiones.",
            reasoning: ["La adherencia cayo por debajo del 50%."],
            direction: "decrease",
            adjustmentPct: 10,
            decision: "accepted",
            metrics: [{ label: "Adherencia", value: "25%" }],
            safetyNotes: ["El ajuste esta limitado al 10%."],
          },
        ],
      },
    });

    renderClient();

    fireEvent.click(screen.getByRole("button", { name: /aceptar/i }));

    await waitFor(() => {
      expect(submitWeeklyReviewDecisionMock).toHaveBeenCalledWith({
        weekKey: "2026-02-16",
        recommendationId: "training-deload",
        decision: "accepted",
      });
    });

    expect(await screen.findByText(/aceptado/i)).toBeInTheDocument();
    expect(trackWeeklyReviewEventMock).toHaveBeenCalledWith(expect.objectContaining({ event: "adjustment_accepted", recommendationId: "training-deload" }));
  });
});
