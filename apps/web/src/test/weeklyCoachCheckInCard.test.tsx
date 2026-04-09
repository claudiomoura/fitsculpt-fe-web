import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WeeklyCoachCheckInCard from "@/components/weekly-adaptive-coach/WeeklyCoachCheckInCard";

const serviceMocks = vi.hoisted(() => ({
  acknowledgeWeeklyCoachAdaptationSummary: vi.fn(),
  getWeeklyCoachState: vi.fn(),
  getWeeklyCoachCheckInDraft: vi.fn(),
  saveWeeklyCoachCheckInDraft: vi.fn(),
  submitWeeklyCoachCheckIn: vi.fn(),
}));

vi.mock("@/services/weeklyAdaptiveCoach", () => serviceMocks);
vi.mock("@/lib/aiRequestId", () => ({ createAiRequestId: () => "req-weekly-card" }));

const weeklyStateResponse = {
  ok: true as const,
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
    nextAction: "submit_weekly_check_in",
    checkInDue: true,
    planSummary: {
      trainingSummary: ["3 planned sessions"],
      nutritionSummary: ["4 meals per day"],
      assumptions: ["Maintain goal"],
    },
    latestAdaptationSummary: null,
    featureFlags: {
      weeklyCoachEnabled: true,
      weeklyCheckInEnabled: true,
      adaptationEnabled: false,
    },
  },
};

const adaptationReadyWeeklyStateResponse = {
  ok: true as const,
  data: {
    ...weeklyStateResponse.data,
    loopState: "adaptation_generated",
    currentWeek: {
      ...weeklyStateResponse.data.currentWeek,
      state: "adaptation_ready",
    },
    nextAction: "review_adaptation_summary",
    checkInDue: false,
    latestAdaptationSummary:
      "Keep the current weekly structure and repeat the core targets next week. This check-in recorded 3/3 planned sessions completed with nutrition adherence 4/5. Primary friction to manage next week: time.",
    featureFlags: {
      ...weeklyStateResponse.data.featureFlags,
      adaptationEnabled: true,
    },
  },
};

const adaptationAcceptedWeeklyStateResponse = {
  ok: true as const,
  data: {
    ...adaptationReadyWeeklyStateResponse.data,
    loopState: "adaptation_accepted",
    currentWeek: {
      ...adaptationReadyWeeklyStateResponse.data.currentWeek,
      state: "accepted",
      acceptedAt: "2026-04-19T10:00:00.000Z",
    },
    nextAction: "follow_current_week_plan",
  },
};

const draftResponse = {
  ok: true as const,
  data: {
    checkInId: null,
    checkInState: "draft",
    weekContext: {
      planWeekId: "weekly_coach_2026-04-13",
      weekIndex: 16,
      state: "check_in_due",
      validFrom: "2026-04-13",
      validTo: "2026-04-19",
      weeklyObjective: "Stay consistent.",
    },
    draftAnswers: {
      trainingSessionsCompleted: 2,
      trainingSessionsPlanned: 3,
      nutritionAdherenceScore: 4,
      progressMode: "weight",
      currentWeightKg: 80.2,
      energyScore: 4,
      hungerScore: 3,
      recoveryScore: 4,
      stressScore: 2,
      painLevel: "expected_soreness",
      frictionPrimary: "time",
      frictionNote: null,
      contextChangeFlag: false,
      contextChangeType: null,
      nextWeekConfidenceScore: 4,
    },
    requiredFields: ["trainingSessionsCompleted", "progressMode"],
    completionState: {
      completedFields: ["trainingSessionsCompleted", "progressMode"],
      missingRequiredFields: [],
      isComplete: true,
    },
    deadline: "2026-04-19T23:59:59.000Z",
    nextCta: "submit_weekly_check_in",
    updatedAt: "2026-04-19T10:00:00.000Z",
  },
};

describe("WeeklyCoachCheckInCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getWeeklyCoachState.mockResolvedValue(weeklyStateResponse);
    serviceMocks.getWeeklyCoachCheckInDraft.mockResolvedValue(draftResponse);
    serviceMocks.saveWeeklyCoachCheckInDraft.mockResolvedValue(draftResponse);
    serviceMocks.acknowledgeWeeklyCoachAdaptationSummary.mockResolvedValue(adaptationAcceptedWeeklyStateResponse);
    serviceMocks.submitWeeklyCoachCheckIn.mockResolvedValue({
      ok: true as const,
      data: {
        ...draftResponse.data,
        checkInId: "checkin-1",
        checkInState: "submitted",
      },
    });
  });

  it("loads weekly state and submits the thin check-in form", async () => {
    serviceMocks.getWeeklyCoachState
      .mockResolvedValueOnce(weeklyStateResponse)
      .mockResolvedValueOnce(adaptationReadyWeeklyStateResponse);

    render(<WeeklyCoachCheckInCard />);

    expect(screen.getByLabelText("Loading weekly coach check-in")).toBeInTheDocument();
    expect(await screen.findByTestId("weekly-coach-checkin-card")).toHaveAttribute("id", "weekly-coach-checkin");

    fireEvent.change(screen.getByLabelText("Sessions completed"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Current weight (kg)"), { target: { value: "79.8" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit weekly check-in" }));

    await waitFor(() => {
      expect(serviceMocks.submitWeeklyCoachCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          contractVersion: "1.0",
          clientRequestId: "req-weekly-card",
          trainingSessionsCompleted: 3,
          trainingSessionsPlanned: 3,
          currentWeightKg: 79.8,
        }),
      );
    });

    expect(await screen.findByText(/Weekly check-in submitted\. Reloaded the persisted coach summary\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/Keep the current weekly structure and repeat the core targets next week\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Keep following the current plan unless this summary says otherwise\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acknowledge summary" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Already submitted" })).toBeDisabled();
  });

  it("acknowledges the persisted adaptation summary", async () => {
    serviceMocks.getWeeklyCoachState.mockResolvedValue(adaptationReadyWeeklyStateResponse);
    serviceMocks.getWeeklyCoachCheckInDraft.mockResolvedValue({
      ok: true as const,
      data: {
        ...draftResponse.data,
        checkInId: "checkin-1",
        checkInState: "submitted",
      },
    });

    render(<WeeklyCoachCheckInCard />);

    expect(await screen.findByText(/Keep the current weekly structure and repeat the core targets next week\./i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge summary" }));

    await waitFor(() => {
      expect(serviceMocks.acknowledgeWeeklyCoachAdaptationSummary).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Adaptation summary acknowledged and persisted.")).toBeInTheDocument();
    expect(screen.getByText(/Summary acknowledged at 2026-04-19T10:00:00.000Z\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Summary acknowledged" })).toBeDisabled();
  });

  it("shows an error state and retries loading", async () => {
    serviceMocks.getWeeklyCoachState
      .mockResolvedValueOnce({ ok: false as const, reason: "httpError", message: "Upstream unavailable" })
      .mockResolvedValueOnce(weeklyStateResponse);

    render(<WeeklyCoachCheckInCard />);

    expect(await screen.findByText("Weekly coach check-in unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByTestId("weekly-coach-checkin-card")).toBeInTheDocument();
    expect(serviceMocks.getWeeklyCoachState).toHaveBeenCalledTimes(2);
  });

  it("saves a draft without submitting", async () => {
    render(<WeeklyCoachCheckInCard />);

    expect(await screen.findByTestId("weekly-coach-checkin-card")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Friction note"), { target: { value: "Busy travel week" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(serviceMocks.saveWeeklyCoachCheckInDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          frictionNote: "Busy travel week",
          progressMode: "weight",
        }),
      );
    });

    expect(await screen.findByText("Draft saved to the weekly coach scaffold.")).toBeInTheDocument();
  });
});
