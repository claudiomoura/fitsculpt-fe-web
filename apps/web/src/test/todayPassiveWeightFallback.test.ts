import { describe, expect, it } from "vitest";
import { getLatestPassiveWeight } from "@/app/(app)/app/hoy/TodayQuickActionsClient";

describe("getLatestPassiveWeight", () => {
  it("returns latest smart-scale weight by date and sync time", () => {
    const weight = getLatestPassiveWeight({
      passiveData: {
        snapshots: [
          {
            date: "2026-04-08",
            bodyWeightKg: 85.2,
            syncedAt: "2026-04-08T08:00:00.000Z",
          },
          {
            date: "2026-04-09",
            bodyWeightKg: 84.9,
            syncedAt: "2026-04-09T06:30:00.000Z",
          },
          {
            date: "2026-04-09",
            bodyWeightKg: 84.7,
            syncedAt: "2026-04-09T09:10:00.000Z",
          },
        ],
      },
    });

    expect(weight).toBe(84.7);
  });
});
