import { describe, expect, it } from "vitest";
import { pickLatestOpenWorkoutSession } from "@/lib/workoutSessionSelection";

describe("pickLatestOpenWorkoutSession", () => {
  it("returns latest open session by startedAt", () => {
    const picked = pickLatestOpenWorkoutSession([
      { id: "s1", workoutId: "w1", startedAt: "2026-04-01T08:00:00.000Z", finishedAt: null },
      { id: "s2", workoutId: "w1", startedAt: "2026-04-02T08:00:00.000Z", finishedAt: null },
      { id: "s3", workoutId: "w1", startedAt: "2026-04-03T08:00:00.000Z", finishedAt: "2026-04-03T09:00:00.000Z" },
    ]);

    expect(picked?.id).toBe("s2");
  });

  it("returns null when there is no open session", () => {
    const picked = pickLatestOpenWorkoutSession([
      { id: "s1", workoutId: "w1", startedAt: "2026-04-01T08:00:00.000Z", finishedAt: "2026-04-01T09:00:00.000Z" },
    ]);

    expect(picked).toBeNull();
  });
});
