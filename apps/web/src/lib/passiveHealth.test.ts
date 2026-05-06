import { describe, expect, it } from "vitest";
import { buildDemoPassiveSnapshots, buildPassiveHealthOverview, mergePassiveSnapshotsWithPriority } from "@/lib/passiveHealth";

describe("passiveHealth", () => {
  it("calculates passive adherence support without replacing manual tracking", () => {
    const snapshots = buildDemoPassiveSnapshots("2026-02-22");
    const overview = buildPassiveHealthOverview(
      {
        snapshots,
        lastSyncAt: "2026-02-22T08:00:00.000Z",
        lastSyncSource: "demo",
      },
      {
        startDate: "2026-02-16",
        endDate: "2026-02-22",
        targetSessions: 4,
      },
    );

    expect(overview.activeDays).toBeGreaterThanOrEqual(3);
    expect(overview.totalSteps).toBeGreaterThan(30000);
    expect(overview.supportPct).toBeGreaterThan(0);
    expect(overview.supportPct).toBeLessThanOrEqual(25);
  });

  it("prefers android-source rows over manual/demo for same date", () => {
    const merged = mergePassiveSnapshotsWithPriority(
      [
        {
          id: "manual-2026-05-01",
          date: "2026-05-01",
          source: "manual",
          provider: "Manual sync",
          steps: 4000,
          activeCalories: 220,
          activeMinutes: 20,
          sleepHours: 6.5,
          restingHeartRate: 63,
          bodyWeightKg: null,
          bodyFatPercent: null,
          exerciseSessions: 0,
          note: "Manual sync",
          syncedAt: "2026-05-01T08:00:00.000Z",
        },
      ],
      [
        {
          id: "health-connect-2026-05-01",
          date: "2026-05-01",
          source: "health_connect",
          provider: "Health Connect",
          steps: 9300,
          activeCalories: 430,
          activeMinutes: 48,
          sleepHours: 7.4,
          restingHeartRate: 58,
          bodyWeightKg: null,
          bodyFatPercent: null,
          exerciseSessions: 1,
          note: "Android sync",
          syncedAt: "2026-05-01T08:30:00.000Z",
        },
      ],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe("health_connect");
    expect(merged[0]?.steps).toBe(9300);
  });
});
