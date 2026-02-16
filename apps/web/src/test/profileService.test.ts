import { describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/lib/profile";
import { saveCheckinAndSyncProfileMetrics } from "@/lib/profileService";

describe("saveCheckinAndSyncProfileMetrics", () => {
  it("updates profile metrics based on the latest check-in", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false });
    global.fetch = fetchMock as unknown as typeof fetch;

    const updated = await saveCheckinAndSyncProfileMetrics(
      { checkins: [], foodLog: [], workoutLog: [] },
      defaultProfile,
      {
        weightKg: 82,
        chestCm: 95,
        waistCm: 78,
        hipsCm: 98,
        bicepsCm: 34,
        thighCm: 56,
        calfCm: 37,
        neckCm: 38,
        bodyFatPercent: 20,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(updated.weightKg).toBe(82);
    expect(updated.measurements.waistCm).toBe(78);
  });
});
