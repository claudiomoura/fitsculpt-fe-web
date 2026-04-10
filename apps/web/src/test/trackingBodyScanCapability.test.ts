import { describe, expect, it } from "vitest";
import { defaultProfile } from "@/lib/profile";
import type { CheckinEntry, PassiveHealthData } from "@/services/tracking";
import {
  buildTrackingBodyScanCapability,
  loadTrackingBodyScanCapability,
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

describe("tracking body scan capability", () => {
  it("builds a reusable deterministic body-scan payload", () => {
    const passiveData: PassiveHealthData = {
      snapshots: [
        {
          id: "passive-1",
          date: "2026-04-09",
          source: "health_connect",
          provider: "Health Connect",
          steps: 9200,
          activeCalories: 340,
          activeMinutes: 42,
          sleepHours: 7.2,
          restingHeartRate: 58,
          exerciseSessions: 1,
          note: "",
          syncedAt: "2026-04-09T08:00:00.000Z",
        },
      ],
      lastSyncAt: "2026-04-09T08:00:00.000Z",
      lastSyncSource: "health_connect",
    };

    const result = buildTrackingBodyScanCapability({
      origin: "tracking",
      profile: { ...defaultProfile, goal: "cut" },
      checkins: [
        buildCheckin({ id: "old", date: "2026-03-28", weightKg: 82, waistCm: 86, bodyFatPercent: 20, frontPhotoUrl: "front-old" }),
        buildCheckin({ id: "new", date: "2026-04-10", weightKg: 80, waistCm: 84, bodyFatPercent: 18, frontPhotoUrl: "front-new", sidePhotoUrl: "side-new" }),
      ],
      passiveData,
      rangeDays: 30,
    });

    expect(result.status).toBe("ready");
    expect(result.state).toBe("ready");
    expect(result.confidence).toBe("medium");
    expect(result.data.weightDeltaKg).toBe(-2);
    expect(result.data.photoComparison.totalEntriesWithPhotos).toBe(2);
    expect(result.data.composition).not.toBeNull();
    expect(result.data.composition?.bodyFatRangePct.min).toBeLessThan(result.data.composition?.bodyFatPercent ?? 0);
    expect(result.data.composition?.bodyFatRangePct.max).toBeGreaterThan(result.data.composition?.bodyFatPercent ?? 0);
    expect(result.data.composition?.leanMassKg).toBeGreaterThan(60);
    expect(result.data.composition?.fatMassKg).toBeGreaterThan(10);
    expect(result.observations.some((item) => item.includes("peso reciente baja"))).toBe(true);
  });

  it("falls back to anthropometric estimate when manual body fat is missing", () => {
    const result = buildTrackingBodyScanCapability({
      origin: "tracking",
      profile: { ...defaultProfile, sex: "male", age: 34, heightCm: 178, weightKg: 84 },
      checkins: [
        buildCheckin({
          id: "scan-1",
          date: "2026-04-10",
          weightKg: 84,
          waistCm: 88,
          neckCm: 39,
          bodyFatPercent: 0,
          frontPhotoUrl: "front",
          sidePhotoUrl: "side",
        }),
      ],
      passiveData: { snapshots: [], lastSyncAt: null, lastSyncSource: null },
      rangeDays: 30,
    });

    expect(result.data.composition).not.toBeNull();
    expect(result.data.composition?.sources).toContain("us_navy");
    expect(result.data.composition?.sources).toContain("bmi_age");
    expect(result.data.composition?.bodyFatPercent).toBeGreaterThan(10);
    expect(result.data.composition?.bodyFatPercent).toBeLessThan(30);
    expect(result.summary).toContain("rango honesto");
  });

  it("fails closed for AI while still returning deterministic fallback", async () => {
    const result = await loadTrackingBodyScanCapability({
      origin: "tracking",
      profile: defaultProfile,
      checkins: [buildCheckin({ id: "only", date: "2026-04-10", bodyFatPercent: 0, waistCm: 0 })],
      preferAi: true,
      aiProfile: {
        subscriptionPlan: "PRO",
        aiTokenBalance: 400,
        entitlements: { modules: { ai: { enabled: true } } },
      },
    });

    expect(result.analysisMode).toBe("ai_blocked");
    expect(result.aiAssist.status).toBe("blocked");
    expect(result.aiAssist.failureReason).toBe("reservation_unavailable");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("persists body scan output through adapter when available", async () => {
    const result = await loadTrackingBodyScanCapability({
      origin: "tracking",
      profile: defaultProfile,
      checkins: [buildCheckin({ id: "saved", frontPhotoUrl: "front", sidePhotoUrl: "side" })],
      persistenceAdapter: {
        id: "test-adapter",
        save: async () => ({
          id: "scan-1",
          capability: "body-scan",
          origin: "tracking",
          state: "low_confidence",
          confidence: "low",
          createdAt: "2026-04-10T10:00:00.000Z",
          updatedAt: "2026-04-10T10:00:00.000Z",
        }),
      },
    });

    expect(result.persistence.status).toBe("persisted");
    expect(result.persistence.record?.id).toBe("scan-1");
  });
});
