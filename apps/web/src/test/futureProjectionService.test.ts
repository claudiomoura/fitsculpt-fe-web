import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getFutureProjection,
  getRctStatisticalReport,
  getRctSummary,
  getRctStatus,
  sendRctEvent,
} from "@/services/futureProjection";

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

describe("futureProjection service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses future projection contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          generatedAt: "2026-02-23T12:00:00.000Z",
          experiment: {
            id: "future-self-rct-v1",
            group: "treatment",
            projectionMode: "full",
          },
          inputs: {
            goal: "cut",
            currentWeightKg: 80.2,
            targetSessionsPerWeek: 4,
            adherenceScore: 0.72,
            consistencyScore: 0.69,
            loggingFrequencyDaysPerWeek: 4.2,
            weightTrendKgPerWeek: -0.3,
          },
          horizons: [
            {
              months: 3,
              confidence: "medium",
              scenarios: [
                {
                  id: "current-consistency",
                  label: "base",
                  adherenceScore: 0.7,
                  expectedDeltaKg: { min: -2.2, max: -1.4 },
                  projectedWeightKg: { current: 80.2, min: 78.0, max: 78.8 },
                  assumptions: ["A", "B"],
                },
              ],
            },
            {
              months: 6,
              confidence: "medium",
              scenarios: [
                {
                  id: "current-consistency",
                  label: "base",
                  adherenceScore: 0.7,
                  expectedDeltaKg: { min: -4.2, max: -2.8 },
                  projectedWeightKg: { current: 80.2, min: 76.0, max: 77.4 },
                  assumptions: ["A", "B"],
                },
              ],
            },
            {
              months: 12,
              confidence: "low",
              scenarios: [
                {
                  id: "current-consistency",
                  label: "base",
                  adherenceScore: 0.7,
                  expectedDeltaKg: { min: -7.5, max: -4.3 },
                  projectedWeightKg: { current: 80.2, min: 72.7, max: 75.9 },
                  assumptions: ["A", "B"],
                },
              ],
            },
          ],
          limitations: ["A", "B"],
          disclaimer: "No garantiza resultados.",
        }),
      ),
    );

    const result = await getFutureProjection();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.horizons).toHaveLength(3);
      expect(result.data.experiment.id).toBe("future-self-rct-v1");
    }
  });

  it("parses rct status and records events", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, {
            experimentId: "future-self-rct-v1",
            group: "control",
            projectionMode: "minimal",
            status: "active",
            assignedAt: "2026-02-20T08:00:00.000Z",
            latestMetrics: {
              weekKey: "2026-02-23",
              weeklyActivitySessions: 2,
              adherenceScore: 0.55,
              recommendationAcceptanceRate: null,
              loggingFrequencyDays: 3,
              capturedAt: "2026-02-23T12:00:00.000Z",
            },
            eventCounts: {
              projectionViewed: 0,
              scenarioSelected: 0,
              recommendationsAccepted: 0,
              recommendationsRejected: 0,
              loggingEvents: 0,
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, {
            ok: true,
            storedAt: "2026-02-23T12:00:00.000Z",
          }),
        ),
    );

    const status = await getRctStatus();
    expect(status.ok).toBe(true);

    const event = await sendRctEvent({ event: "projection_viewed" });
    expect(event.ok).toBe(true);
  });

  it("parses rct summary contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          experimentId: "future-self-rct-v1",
          generatedAt: "2026-03-22T10:00:00.000Z",
          window: {
            days: 56,
            weeksApprox: 8,
            startDate: "2026-01-26",
            endDate: "2026-03-22",
          },
          groups: {
            control: {
              sampleSize: 10,
              activeUsers: 6,
              retentionProxy: 0.6,
              adherenceMean: 0.45,
              loggingFrequencyMean: 2.1,
              recommendationAcceptanceRate: 0.33,
              weeklyActivitySessionsMean: 1.7,
            },
            treatment: {
              sampleSize: 11,
              activeUsers: 8,
              retentionProxy: 0.727,
              adherenceMean: 0.55,
              loggingFrequencyMean: 2.8,
              recommendationAcceptanceRate: 0.48,
              weeklyActivitySessionsMean: 2.1,
            },
          },
          deltaTreatmentVsControl: {
            sampleSize: 1,
            activeUsers: 2,
            retentionProxy: 0.127,
            adherenceMean: 0.1,
            loggingFrequencyMean: 0.7,
            recommendationAcceptanceRate: 0.15,
            weeklyActivitySessionsMean: 0.4,
          },
          metrics: [
            { key: "sample_size", label: "Usuarios en grupo", unit: "count", control: 10, treatment: 11, deltaTreatmentVsControl: 1 },
            { key: "active_users", label: "Usuarios activos en ventana", unit: "count", control: 6, treatment: 8, deltaTreatmentVsControl: 2 },
            { key: "retention_proxy", label: "Retencion proxy", unit: "ratio", control: 0.6, treatment: 0.727, deltaTreatmentVsControl: 0.127 },
            { key: "adherence_mean", label: "Adherencia media", unit: "ratio", control: 0.45, treatment: 0.55, deltaTreatmentVsControl: 0.1 },
            { key: "logging_frequency_mean", label: "Frecuencia de logging media", unit: "days_per_week", control: 2.1, treatment: 2.8, deltaTreatmentVsControl: 0.7 },
            { key: "recommendation_acceptance_rate", label: "Recommendation acceptance rate", unit: "ratio", control: 0.33, treatment: 0.48, deltaTreatmentVsControl: 0.15 },
            { key: "weekly_activity_sessions_mean", label: "Weekly activity sessions media", unit: "sessions_per_week", control: 1.7, treatment: 2.1, deltaTreatmentVsControl: 0.4 },
          ],
        }),
      ),
    );

    const result = await getRctSummary({ windowWeeks: 8 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.window.days).toBe(56);
      expect(result.data.metrics).toHaveLength(7);
    }
  });

  it("parses rct statistical report contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          experimentId: "future-self-rct-v1",
          generatedAt: "2026-03-22T10:00:00.000Z",
          disclaimer: "Reporte exploratorio para seguimiento de hipotesis RCT.",
          limitations: ["A", "B"],
          window: {
            days: 56,
            weeksApprox: 8,
            startDate: "2026-01-26",
            endDate: "2026-03-22",
          },
          sample: {
            controlN: 12,
            treatmentN: 13,
            minGroupN: 12,
            controlCompleteness: 0.6,
            treatmentCompleteness: 0.69,
            overallCompleteness: 0.645,
            confidence: "low",
            rationale: "n minimo por grupo=12; completitud promedio=65%",
          },
          metrics: [
            {
              key: "retention_proxy",
              label: "Retencion proxy",
              unit: "ratio",
              controlMean: 0.583,
              treatmentMean: 0.692,
              deltaTreatmentVsControl: 0.109,
              relativeEffectPercent: 18.7,
              practicalEffect: "medium practical effect",
              sampleConfidence: "low",
              significance: {
                status: "approximated",
                method: "two_proportion_z",
                statistic: 0.57,
                pValueApprox: 0.56,
                note: "Aproximacion exploratoria.",
              },
            },
            {
              key: "adherence_mean",
              label: "Adherencia media",
              unit: "ratio",
              controlMean: 0.45,
              treatmentMean: 0.57,
              deltaTreatmentVsControl: 0.12,
              relativeEffectPercent: 26.67,
              practicalEffect: "medium practical effect",
              sampleConfidence: "low",
              significance: {
                status: "insufficient_data",
                method: "unavailable",
                statistic: null,
                pValueApprox: null,
                note: "No hay varianza por grupo.",
              },
            },
            {
              key: "logging_frequency_mean",
              label: "Frecuencia de logging media",
              unit: "days_per_week",
              controlMean: 2.2,
              treatmentMean: 2.9,
              deltaTreatmentVsControl: 0.7,
              relativeEffectPercent: 31.82,
              practicalEffect: "large practical effect",
              sampleConfidence: "low",
              significance: {
                status: "insufficient_data",
                method: "unavailable",
                statistic: null,
                pValueApprox: null,
                note: "No hay varianza por grupo.",
              },
            },
            {
              key: "recommendation_acceptance_rate",
              label: "Recommendation acceptance rate",
              unit: "ratio",
              controlMean: 0.36,
              treatmentMean: 0.5,
              deltaTreatmentVsControl: 0.14,
              relativeEffectPercent: 38.89,
              practicalEffect: "large practical effect",
              sampleConfidence: "low",
              significance: {
                status: "approximated",
                method: "two_proportion_z",
                statistic: 0.7,
                pValueApprox: 0.49,
                note: "Aproximacion exploratoria.",
              },
            },
            {
              key: "weekly_activity_sessions_mean",
              label: "Weekly activity sessions media",
              unit: "sessions_per_week",
              controlMean: 1.7,
              treatmentMean: 2.2,
              deltaTreatmentVsControl: 0.5,
              relativeEffectPercent: 29.41,
              practicalEffect: "medium practical effect",
              sampleConfidence: "low",
              significance: {
                status: "insufficient_data",
                method: "unavailable",
                statistic: null,
                pValueApprox: null,
                note: "No hay varianza por grupo.",
              },
            },
          ],
        }),
      ),
    );

    const result = await getRctStatisticalReport({ windowWeeks: 8 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.window.days).toBe(56);
      expect(result.data.metrics).toHaveLength(5);
      expect(result.data.sample.confidence).toBe("low");
    }
  });
});
