import { describe, expect, it } from "vitest";
import { WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION } from "@/types/weeklyAdaptiveCoach";
import {
  createEmptyWeeklyCoachCheckInAnswers,
  parseWeeklyCoachWeeklyStateResponse,
  validateWeeklyCoachCheckInDraftPayload,
  validateWeeklyCoachCheckInSubmitPayload,
  validateWeeklyCoachWeeklyStatePayload,
} from "@/lib/weeklyAdaptiveCoachContracts";

describe("weeklyAdaptiveCoachContracts", () => {
  it("accepts a valid weekly state payload", () => {
    const payload = {
      loopState: "check_in_due",
      currentWeek: {
        planWeekId: "week_003",
        weekIndex: 3,
        state: "check_in_due",
        validFrom: "2026-04-13",
        validTo: "2026-04-19",
        weeklyObjective: "Close the week with 4 sessions and stable nutrition.",
        acceptedAt: "2026-04-13T09:00:00Z",
      },
      nextAction: "complete_check_in",
      checkInDue: true,
      planSummary: {
        trainingSummary: ["4 full-body sessions", "1 recovery walk block"],
        nutritionSummary: ["Protein at each meal", "One planned free meal"],
        assumptions: ["Work travel ended", "Sleep is trending back to baseline"],
      },
      latestAdaptationSummary: null,
      featureFlags: {
        weeklyCoachEnabled: true,
        weeklyCheckInEnabled: true,
        adaptationEnabled: false,
      },
    };

    expect(validateWeeklyCoachWeeklyStatePayload(payload).ok).toBe(true);
    expect(parseWeeklyCoachWeeklyStateResponse(payload)?.currentWeek?.weekIndex).toBe(3);
  });

  it("rejects invalid weekly state transitions at the contract boundary", () => {
    expect(
      validateWeeklyCoachWeeklyStatePayload({
        loopState: "check_in_due",
        currentWeek: {
          planWeekId: "week_003",
          weekIndex: 0,
          state: "check_in_due",
          validFrom: "2026-04-13",
          validTo: "2026-04-19",
          weeklyObjective: null,
          acceptedAt: null,
        },
        nextAction: null,
        checkInDue: true,
        planSummary: null,
        latestAdaptationSummary: null,
        featureFlags: {
          weeklyCoachEnabled: true,
          weeklyCheckInEnabled: true,
          adaptationEnabled: true,
        },
      }).ok,
    ).toBe(false);
  });

  it("accepts a draft check-in payload scaffold", () => {
    expect(
      validateWeeklyCoachCheckInDraftPayload({
        checkInId: null,
        checkInState: "draft",
        weekContext: {
          planWeekId: "week_003",
          weekIndex: 3,
          state: "check_in_due",
          validFrom: "2026-04-13",
          validTo: "2026-04-19",
          weeklyObjective: "Keep momentum while work settles down.",
        },
        draftAnswers: createEmptyWeeklyCoachCheckInAnswers(),
        requiredFields: ["trainingSessionsCompleted", "progressMode", "nextWeekConfidenceScore"],
        completionState: {
          completedFields: [],
          missingRequiredFields: ["trainingSessionsCompleted", "progressMode", "nextWeekConfidenceScore"],
          isComplete: false,
        },
        deadline: "2026-04-20T23:59:59Z",
        nextCta: "continue_check_in",
        updatedAt: null,
      }).ok,
    ).toBe(true);
  });

  it("enforces conditional submit fields for weight mode", () => {
    expect(
      validateWeeklyCoachCheckInSubmitPayload({
        contractVersion: WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION,
        clientRequestId: "req_123",
        trainingSessionsCompleted: 3,
        trainingSessionsPlanned: 4,
        nutritionAdherenceScore: 4,
        progressMode: "weight",
        currentWeightKg: null,
        perceivedProgress: null,
        energyScore: 3,
        hungerScore: 3,
        recoveryScore: 2,
        stressScore: 4,
        painLevel: "expected_soreness",
        frictionPrimary: "time",
        frictionNote: null,
        contextChangeFlag: false,
        contextChangeType: null,
        nextWeekConfidenceScore: 3,
      }).ok,
    ).toBe(false);
  });

  it("accepts a valid submit payload for perceived progress mode", () => {
    expect(
      validateWeeklyCoachCheckInSubmitPayload({
        contractVersion: WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION,
        clientRequestId: "req_456",
        trainingSessionsCompleted: 2,
        trainingSessionsPlanned: 3,
        nutritionAdherenceScore: 3,
        progressMode: "perceived_progress",
        currentWeightKg: null,
        perceivedProgress: "slight_progress",
        energyScore: 3,
        hungerScore: 4,
        recoveryScore: 3,
        stressScore: 4,
        painLevel: "expected_soreness",
        frictionPrimary: "time",
        frictionNote: "Late meetings reduced training time.",
        contextChangeFlag: true,
        contextChangeType: "work_peak",
        nextWeekConfidenceScore: 2,
      }).ok,
    ).toBe(true);
  });
});
