import { describe, expect, it } from "vitest";
import { defaultProfile } from "@/lib/profile";
import type { CheckinEntry, PassiveHealthData } from "@/services/tracking";
import {
  buildTrackingProfileSnapshotFallback,
  detectTrackingSupport,
  selectCheckinsInTrendWindow,
  selectPassiveSupportSnapshot,
  selectTrackingAdherenceContext,
  selectTrackingPhotoComparison,
} from "@/domains/tracking-intelligence";

function buildCheckin(overrides: Partial<CheckinEntry>): CheckinEntry {
  return {
    id: overrides.id ?? "checkin-1",
    date: overrides.date ?? "2026-04-10",
    weightKg: overrides.weightKg ?? 80,
    chestCm: overrides.chestCm ?? 100,
    waistCm: overrides.waistCm ?? 85,
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

describe("tracking intelligence selectors", () => {
  it("builds a profile fallback snapshot when metrics exist", () => {
    const profile = {
      ...defaultProfile,
      weightKg: 82,
      measurements: {
        ...defaultProfile.measurements,
        bodyFatPercent: 20,
        waistCm: 84,
      },
    };

    const result = buildTrackingProfileSnapshotFallback(profile);

    expect(result?.id).toBe("profile-snapshot");
    expect(result?.weightKg).toBe(82);
    expect(result?.bodyFatPercent).toBe(20);
  });

  it("detects tracking field support from raw payloads", () => {
    const support = detectTrackingSupport([
      { id: "1", energy: 3, notes: "ok", waistCm: 80, chestCm: 100, bodyFatPercent: 18 },
    ]);

    expect(support).toEqual({
      energy: true,
      notes: true,
      bodyFat: true,
      waist: true,
      measurements: true,
    });
  });

  it("selects trend-window checkins and photo comparison", () => {
    const checkins = [
      buildCheckin({ id: "older", date: "2026-04-01", frontPhotoUrl: "front-old" }),
      buildCheckin({ id: "latest", date: "2026-04-10", sidePhotoUrl: "side-new" }),
      buildCheckin({ id: "out", date: "2026-02-01" }),
    ];

    const inWindow = selectCheckinsInTrendWindow(checkins, 10, new Date("2026-04-10T12:00:00.000Z"));
    const photoComparison = selectTrackingPhotoComparison(checkins);

    expect(inWindow.map((entry) => entry.id)).toEqual(["older", "latest"]);
    expect(photoComparison.current?.id).toBe("latest");
    expect(photoComparison.baseline?.id).toBe("older");
  });

  it("builds passive support and adherence context for downstream capabilities", () => {
    const passiveData: PassiveHealthData = {
      snapshots: [
        {
          id: "passive-1",
          date: "2026-04-09",
          source: "health_connect",
          provider: "Health Connect",
          steps: 9000,
          activeCalories: 320,
          activeMinutes: 48,
          sleepHours: 7.5,
          restingHeartRate: 58,
          exerciseSessions: 1,
          note: "",
          syncedAt: "2026-04-09T08:00:00.000Z",
        },
      ],
      lastSyncAt: "2026-04-09T08:00:00.000Z",
      lastSyncSource: "health_connect",
    };

    const context = selectTrackingAdherenceContext({
      checkins: [buildCheckin({ date: "2026-04-10" })],
      mealLog: [],
      workoutLog: [{ id: "w1", date: "2026-04-08", name: "Push", durationMin: 45, notes: "" }],
      passiveData,
      profile: {
        ...defaultProfile,
        trainingPreferences: { ...defaultProfile.trainingPreferences, daysPerWeek: 4 },
      },
      rangeDays: 7,
    });
    const passiveSnapshot = selectPassiveSupportSnapshot(passiveData, 7, new Date("2026-04-10T12:00:00.000Z"));

    expect(context.targetSessionsPerWeek).toBe(4);
    expect(context.professionalInsights).toBeTruthy();
    expect(passiveSnapshot.snapshots).toHaveLength(1);
    expect(passiveSnapshot.lastSyncSource).toBe("health_connect");
  });
});
