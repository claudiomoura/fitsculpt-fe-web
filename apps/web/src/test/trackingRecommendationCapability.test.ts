import { describe, expect, it } from "vitest";
import { defaultProfile } from "@/lib/profile";
import type { CheckinEntry } from "@/services/tracking";
import {
  buildTrackingBodyScanCapability,
  buildTrackingRecommendationCapability,
} from "@/domains/tracking-intelligence";

function buildCheckin(overrides: Partial<CheckinEntry>): CheckinEntry {
  return {
    id: overrides.id ?? "checkin-1",
    date: overrides.date ?? "2026-04-10",
    weightKg: overrides.weightKg ?? 80,
    chestCm: overrides.chestCm ?? 100,
    waistCm: overrides.waistCm ?? 84,
    hipsCm: overrides.hipsCm ?? 95,
    bicepsCm: overrides.bicepsCm ?? 32,
    thighCm: overrides.thighCm ?? 55,
    calfCm: overrides.calfCm ?? 37,
    neckCm: overrides.neckCm ?? 39,
    bodyFatPercent: overrides.bodyFatPercent ?? 18,
    energy: overrides.energy ?? 3,
    hunger: overrides.hunger ?? 2,
    notes: overrides.notes ?? "",
    recommendation: overrides.recommendation ?? "",
    frontPhotoUrl: overrides.frontPhotoUrl ?? null,
    sidePhotoUrl: overrides.sidePhotoUrl ?? null,
  };
}

function buildAdherenceContext(overrides?: {
  checkins?: CheckinEntry[];
  workoutCount?: number;
  mealCount?: number;
  passiveCount?: number;
  combinedAdherencePct?: number;
  trainingConsistencyPct?: number;
  nutritionLoggingPct?: number;
  weeklyRateKg?: number | null;
  weeklyWaistDeltaCm?: number | null;
  weeklyBodyFatDeltaPct?: number | null;
}) {
  return {
    checkins: overrides?.checkins ?? [buildCheckin({})],
    mealLog: Array.from({ length: overrides?.mealCount ?? 2 }, (_, index) => ({
      id: `meal-${index}`,
      date: "2026-04-10",
      mealKey: "lunch",
      mealType: "lunch",
      title: "Lunch",
      calories: 600,
      protein: 40,
      carbs: 60,
      fats: 20,
      completedAt: "2026-04-10T12:00:00.000Z",
    })),
    workoutLog: Array.from({ length: overrides?.workoutCount ?? 3 }, (_, index) => ({
      id: `workout-${index}`,
      date: "2026-04-10",
      name: "Push",
      durationMin: 45,
      notes: "",
    })),
    passiveSupport: {
      snapshots: Array.from({ length: overrides?.passiveCount ?? 2 }, (_, index) => ({
        id: `passive-${index}`,
        date: "2026-04-10",
        source: "health_connect" as const,
        provider: "Health Connect",
        steps: 8000,
        activeCalories: 300,
        activeMinutes: 35,
        sleepHours: 7,
        restingHeartRate: 58,
        exerciseSessions: 1,
        note: "",
        syncedAt: "2026-04-10T08:00:00.000Z",
      })),
      lastSyncAt: "2026-04-10T08:00:00.000Z",
      lastSyncSource: "health_connect" as const,
    },
    trendWindow: { startDate: "2026-04-04", endDate: "2026-04-10", rangeDays: 7 },
    targetSessionsPerWeek: 4,
    professionalInsights: {
      combinedAdherencePct: overrides?.combinedAdherencePct ?? 72,
      trainingConsistencyPct: overrides?.trainingConsistencyPct ?? 70,
      nutritionLoggingPct: overrides?.nutritionLoggingPct ?? 65,
      weeklyRateKg: overrides?.weeklyRateKg ?? -0.2,
      weeklyWaistDeltaCm: overrides?.weeklyWaistDeltaCm ?? -0.5,
      weeklyBodyFatDeltaPct: overrides?.weeklyBodyFatDeltaPct ?? -0.4,
    },
  };
}

describe("tracking recommendation capability", () => {
  it("supports scan-only recommendations with deterministic fallback", () => {
    const bodyScan = buildTrackingBodyScanCapability({
      origin: "tracking",
      profile: { ...defaultProfile, goal: "cut" },
      checkins: [
        buildCheckin({ id: "old", date: "2026-03-28", frontPhotoUrl: "front-old", weightKg: 82 }),
        buildCheckin({ id: "new", date: "2026-04-10", frontPhotoUrl: "front-new", sidePhotoUrl: "side-new", weightKg: 80 }),
      ],
      rangeDays: 30,
    });

    const result = buildTrackingRecommendationCapability({
      origin: "tracking",
      profile: { ...defaultProfile, goal: "cut" },
      adherenceContext: buildAdherenceContext(),
      bodyScan,
    });

    expect(result.status).toBe("ready");
    expect(result.inputMatrix.hasBodyScan).toBe(true);
    expect(result.inputMatrix.hasProjection).toBe(false);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("supports projection-only recommendations", () => {
    const result = buildTrackingRecommendationCapability({
      origin: "weekly_review",
      profile: { ...defaultProfile, goal: "cut" },
      adherenceContext: buildAdherenceContext({ combinedAdherencePct: 68, trainingConsistencyPct: 66 }),
      projection: {
        status: "ready",
        projection: {
          generatedAt: "2026-04-10T10:00:00.000Z",
          experiment: { id: "exp-1", group: "treatment", projectionMode: "full" },
          inputs: {
            goal: "cut",
            currentWeightKg: 80,
            targetSessionsPerWeek: 4,
            adherenceScore: 0.68,
            consistencyScore: 0.66,
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
                  adherenceScore: 0.68,
                  expectedDeltaKg: { min: -2, max: -1 },
                  projectedWeightKg: { current: 80, min: 78, max: 79 },
                  assumptions: ["Mantener 4 sesiones/sem"],
                },
                {
                  id: "improved-consistency",
                  label: "Mejorada",
                  adherenceScore: 0.8,
                  expectedDeltaKg: { min: -3.5, max: -2 },
                  projectedWeightKg: { current: 80, min: 76.5, max: 78 },
                  assumptions: ["Subir consistencia al 80%"],
                },
              ],
            },
          ],
          limitations: ["Deterministic model"],
          disclaimer: "No guarantees.",
        },
        rctStatus: null,
      },
    });

    expect(result.inputMatrix.hasProjection).toBe(true);
    expect(result.items.some((item) => item.id === "review-projection-assumptions")).toBe(true);
    expect(result.explainability.summary).toContain("projection real");
  });

  it("combines projection and body-scan sources when both are available", () => {
    const bodyScan = buildTrackingBodyScanCapability({
      origin: "tracking",
      profile: { ...defaultProfile, goal: "cut" },
      checkins: [
        buildCheckin({ id: "old", date: "2026-03-28", frontPhotoUrl: "front-old", sidePhotoUrl: "side-old", weightKg: 82 }),
        buildCheckin({ id: "new", date: "2026-04-10", frontPhotoUrl: "front-new", sidePhotoUrl: "side-new", weightKg: 80 }),
      ],
      rangeDays: 30,
    });

    const result = buildTrackingRecommendationCapability({
      origin: "weekly_review",
      profile: { ...defaultProfile, goal: "cut" },
      adherenceContext: buildAdherenceContext({ combinedAdherencePct: 58, trainingConsistencyPct: 54 }),
      bodyScan,
      projection: {
        status: "ready",
        projection: {
          generatedAt: "2026-04-10T10:00:00.000Z",
          experiment: { id: "exp-1", group: "treatment", projectionMode: "full" },
          inputs: {
            goal: "cut",
            currentWeightKg: 80,
            targetSessionsPerWeek: 4,
            adherenceScore: 0.58,
            consistencyScore: 0.54,
            loggingFrequencyDaysPerWeek: 3,
            weightTrendKgPerWeek: -0.1,
          },
          horizons: [
            {
              months: 3,
              confidence: "low",
              scenarios: [
                {
                  id: "current-consistency",
                  label: "Actual",
                  adherenceScore: 0.58,
                  expectedDeltaKg: { min: -1, max: 0 },
                  projectedWeightKg: { current: 80, min: 79, max: 80 },
                  assumptions: ["Mantener 3 sesiones/sem"],
                },
              ],
            },
          ],
          limitations: ["Deterministic model"],
          disclaimer: "No guarantees.",
        },
        rctStatus: null,
      },
    });

    expect(result.inputMatrix.canCombineProjectionAndScan).toBe(true);
    expect(result.summary).toContain("projection, body scan");
    expect(result.explainability.sourceStatus).toBe("ready");
  });

  it("honors the active projection scenario selected by the consumer", () => {
    const result = buildTrackingRecommendationCapability({
      origin: "weekly_review",
      profile: { ...defaultProfile, goal: "cut" },
      adherenceContext: buildAdherenceContext({ combinedAdherencePct: 72, trainingConsistencyPct: 70 }),
      projection: {
        status: "ready",
        activeScenarioByHorizon: { 3: "improved-consistency" },
        explainability: {
          sourceStatus: "ready",
          summary: "Projection lista con horizonte principal a 3 meses en escenario mejorado.",
          rationale: ["Confianza medium."],
          fallbackLabel: null,
        },
        projection: {
          generatedAt: "2026-04-10T10:00:00.000Z",
          experiment: { id: "exp-1", group: "treatment", projectionMode: "full" },
          inputs: {
            goal: "cut",
            currentWeightKg: 80,
            targetSessionsPerWeek: 4,
            adherenceScore: 0.72,
            consistencyScore: 0.7,
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
                  adherenceScore: 0.72,
                  expectedDeltaKg: { min: -2, max: -1 },
                  projectedWeightKg: { current: 80, min: 78, max: 79 },
                  assumptions: ["Mantener 4 sesiones/sem"],
                },
                {
                  id: "improved-consistency",
                  label: "Mejorada",
                  adherenceScore: 0.82,
                  expectedDeltaKg: { min: -3.5, max: -2.2 },
                  projectedWeightKg: { current: 80, min: 76.5, max: 77.8 },
                  assumptions: ["Subir consistencia al 82%"],
                },
              ],
            },
          ],
          limitations: ["Deterministic model"],
          disclaimer: "No guarantees.",
        },
        rctStatus: null,
      },
    });

    const projectionItem = result.items.find(
      (item) => item.id === "review-projection-assumptions",
    );

    expect(projectionItem?.summary).toContain("mejora");
    expect(result.explainability.rationale[0]).toContain("escenario mejorado");
  });
});
