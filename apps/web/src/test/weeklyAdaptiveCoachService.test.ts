import { describe, expect, it, vi } from "vitest";
import { WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION } from "@/types/weeklyAdaptiveCoach";
import { getWeeklyCoachCheckInDraft, getWeeklyCoachState, saveWeeklyCoachCheckInDraft, submitWeeklyCoachCheckIn } from "@/services/weeklyAdaptiveCoach";

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

describe("weeklyAdaptiveCoach service", () => {
  it("parses weekly state and check-in draft contracts", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, {
            loopState: "plan_active",
            currentWeek: {
              planWeekId: "weekly_coach_2026-04-13",
              weekIndex: 16,
              state: "active",
              validFrom: "2026-04-13",
              validTo: "2026-04-19",
              weeklyObjective: "Support maintain with 3 training sessions and steady nutrition adherence.",
              acceptedAt: null,
            },
            nextAction: "follow_current_week_plan",
            checkInDue: false,
            planSummary: {
              trainingSummary: ["3 planned training sessions this week"],
              nutritionSummary: ["4 meals per day target"],
              assumptions: ["Goal remains maintain"],
            },
            latestAdaptationSummary: null,
            featureFlags: {
              weeklyCoachEnabled: true,
              weeklyCheckInEnabled: true,
              adaptationEnabled: false,
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, {
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
              progressMode: "weight",
              currentWeightKg: 80.2,
              contextChangeFlag: false,
              frictionNote: null,
              contextChangeType: null,
            },
            requiredFields: ["trainingSessionsCompleted", "progressMode"],
            completionState: {
              completedFields: ["trainingSessionsCompleted", "progressMode"],
              missingRequiredFields: [],
              isComplete: true,
            },
            deadline: "2026-04-19T23:59:59.000Z",
            nextCta: "submit_weekly_check_in",
            updatedAt: null,
          }),
        ),
    );

    const state = await getWeeklyCoachState();
    const draft = await getWeeklyCoachCheckInDraft();

    expect(state.ok).toBe(true);
    expect(draft.ok).toBe(true);
    if (state.ok) expect(state.data.currentWeek?.planWeekId).toBe("weekly_coach_2026-04-13");
    if (draft.ok) expect(draft.data.draftAnswers.currentWeightKg).toBe(80.2);
  });

  it("returns invalidResponse when weekly coach payload drifts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { foo: "bar" })));

    const result = await getWeeklyCoachState();

    expect(result).toEqual({
      ok: false,
      reason: "invalidResponse",
      message: "Weekly coach state response does not match expected contract.",
    });
  });

  it("validates submit payload locally before requesting the BFF", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitWeeklyCoachCheckIn({
      contractVersion: WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION,
      clientRequestId: "req_123",
      trainingSessionsCompleted: 4,
      trainingSessionsPlanned: 3,
      nutritionAdherenceScore: 4,
      progressMode: "weight",
      currentWeightKg: 80.1,
      perceivedProgress: null,
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
    });

    expect(result).toEqual({
      ok: false,
      reason: "validation",
      message: "Weekly coach check-in payload does not match expected contract.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a weekly coach draft through the BFF contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
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
          currentWeightKg: 80.1,
          energyScore: 4,
          hungerScore: 2,
          recoveryScore: 3,
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
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await saveWeeklyCoachCheckInDraft({
      trainingSessionsCompleted: 2,
      trainingSessionsPlanned: 3,
      nutritionAdherenceScore: 4,
      progressMode: "weight",
      currentWeightKg: 80.1,
      energyScore: 4,
      hungerScore: 2,
      recoveryScore: 3,
      stressScore: 2,
      painLevel: "expected_soreness",
      frictionPrimary: "time",
      frictionNote: null,
      contextChangeFlag: false,
      contextChangeType: null,
      nextWeekConfidenceScore: 4,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/weekly-adaptive-coach/check-in",
      expect.objectContaining({ method: "PUT" }),
    );
    if (result.ok) {
      expect(result.data.checkInState).toBe("draft");
      expect(result.data.updatedAt).toBe("2026-04-19T10:00:00.000Z");
    }
  });
});
