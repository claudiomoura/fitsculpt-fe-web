import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadTrackingProjectionCapability,
  selectTrackingProjectionScenario,
  toTrackingRecommendationProjectionInput,
} from "@/domains/tracking-intelligence";

vi.mock("@/services/futureProjection", () => ({
  getFutureProjection: vi.fn(),
  getRctStatus: vi.fn(),
}));

import { getFutureProjection, getRctStatus } from "@/services/futureProjection";

describe("tracking projection capability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a reusable ready payload with scenario defaults", async () => {
    vi.mocked(getFutureProjection).mockResolvedValue({
      ok: true,
      data: {
        generatedAt: "2026-04-10T10:00:00.000Z",
        experiment: { id: "exp-1", group: "treatment", projectionMode: "full" },
        inputs: {
          goal: "cut",
          currentWeightKg: 80,
          targetSessionsPerWeek: 4,
          adherenceScore: 0.7,
          consistencyScore: 0.65,
          loggingFrequencyDaysPerWeek: 4,
          weightTrendKgPerWeek: -0.2,
        },
        horizons: [
          {
            months: 3,
            confidence: "medium",
            scenarios: [
              {
                id: "current-consistency",
                label: "Actual",
                adherenceScore: 0.7,
                expectedDeltaKg: { min: -2, max: -1 },
                projectedWeightKg: { current: 80, min: 78, max: 79 },
                assumptions: ["A"],
              },
            ],
          },
        ],
        limitations: ["A"],
        disclaimer: "No guarantees.",
      },
    });
    vi.mocked(getRctStatus).mockResolvedValue({
      ok: true,
      data: {
        experimentId: "exp-1",
        group: "treatment",
        projectionMode: "full",
        status: "active",
        assignedAt: "2026-04-10T10:00:00.000Z",
        latestMetrics: {
          weekKey: "2026-04-07",
          weeklyActivitySessions: 4,
          adherenceScore: 0.7,
          recommendationAcceptanceRate: 0.4,
          loggingFrequencyDays: 4,
          capturedAt: "2026-04-10T10:00:00.000Z",
        },
        eventCounts: {
          projectionViewed: 1,
          scenarioSelected: 0,
          recommendationsAccepted: 0,
          recommendationsRejected: 0,
          loggingEvents: 2,
        },
      },
    });

    const result = await loadTrackingProjectionCapability("weekly_review");

    expect(result.status).toBe("ready");
    expect(result.activeScenarioByHorizon).toEqual({ 3: "current-consistency" });
    expect(result.rctStatus?.group).toBe("treatment");
    expect(result.explainability.summary).toContain("3 meses");
    expect(result.explainability.sourceStatus).toBe("ready");
  });

  it("returns a standardized error payload when loading fails", async () => {
    vi.mocked(getFutureProjection).mockResolvedValue({ ok: false, reason: "networkError", message: "x" });
    vi.mocked(getRctStatus).mockResolvedValue({ ok: false, reason: "networkError", message: "x" });

    const result = await loadTrackingProjectionCapability("weekly_review");

    expect(result.status).toBe("error");
    expect(result.errorMessage).toContain("No pudimos cargar");
    expect(result.explainability.fallbackLabel).toBe("projection_unavailable");
  });

  it("exposes reusable projection input for recommendation consumers", async () => {
    vi.mocked(getFutureProjection).mockResolvedValue({
      ok: true,
      data: {
        generatedAt: "2026-04-10T10:00:00.000Z",
        experiment: { id: "exp-1", group: "treatment", projectionMode: "full" },
        inputs: {
          goal: "cut",
          currentWeightKg: 80,
          targetSessionsPerWeek: 4,
          adherenceScore: 0.7,
          consistencyScore: 0.65,
          loggingFrequencyDaysPerWeek: 4,
          weightTrendKgPerWeek: -0.2,
        },
        horizons: [
          {
            months: 3,
            confidence: "medium",
            scenarios: [
              {
                id: "current-consistency",
                label: "Actual",
                adherenceScore: 0.7,
                expectedDeltaKg: { min: -2, max: -1 },
                projectedWeightKg: { current: 80, min: 78, max: 79 },
                assumptions: ["Mantener 4 sesiones/sem"],
              },
            ],
          },
        ],
        limitations: ["A"],
        disclaimer: "No guarantees.",
      },
    });
    vi.mocked(getRctStatus).mockResolvedValue({
      ok: true,
      data: {
        experimentId: "exp-1",
        group: "treatment",
        projectionMode: "full",
        status: "active",
        assignedAt: "2026-04-10T10:00:00.000Z",
        latestMetrics: {
          weekKey: "2026-04-07",
          weeklyActivitySessions: 4,
          adherenceScore: 0.7,
          recommendationAcceptanceRate: 0.4,
          loggingFrequencyDays: 4,
          capturedAt: "2026-04-10T10:00:00.000Z",
        },
        eventCounts: {
          projectionViewed: 1,
          scenarioSelected: 0,
          recommendationsAccepted: 0,
          recommendationsRejected: 0,
          loggingEvents: 2,
        },
      },
    });

    const result = await loadTrackingProjectionCapability("tracking");
    const integrationInput = toTrackingRecommendationProjectionInput(result);
    const selection = selectTrackingProjectionScenario({
      projection: integrationInput?.projection ?? null,
      activeScenarioByHorizon: integrationInput?.activeScenarioByHorizon,
    });

    expect(integrationInput?.explainability?.summary).toContain("Projection lista");
    expect(selection?.scenario.id).toBe("current-consistency");
  });
});
