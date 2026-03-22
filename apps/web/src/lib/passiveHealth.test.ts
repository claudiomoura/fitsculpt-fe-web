import { describe, expect, it } from "vitest";
import { buildDemoPassiveSnapshots, buildPassiveHealthOverview } from "@/lib/passiveHealth";

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
});
