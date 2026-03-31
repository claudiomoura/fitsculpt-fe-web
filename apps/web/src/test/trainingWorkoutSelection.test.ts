import { describe, expect, it } from "vitest";
import { pickWorkoutIdForDateCandidates } from "@/lib/trainingWorkoutSelection";

describe("pickWorkoutIdForDateCandidates", () => {
  it("prefers finished-session workout when duplicates exist", () => {
    const picked = pickWorkoutIdForDateCandidates([
      { id: "w1", name: "Full body", sessions: [] },
      { id: "w2", name: "Full body", sessions: [{ finishedAt: "2026-03-31T09:00:00Z" }] },
    ], "Full body");

    expect(picked).toBe("w2");
  });

  it("falls back to focused workout when none has sessions", () => {
    const picked = pickWorkoutIdForDateCandidates([
      { id: "w1", name: "Upper" },
      { id: "w2", name: "Lower" },
    ], "Lower");

    expect(picked).toBe("w2");
  });

  it("prefers active-session workout over empty duplicate", () => {
    const picked = pickWorkoutIdForDateCandidates([
      { id: "w1", name: "Push day", sessions: [] },
      { id: "w2", name: "Push day", sessions: [{ finishedAt: null }] },
    ], "Push day");

    expect(picked).toBe("w2");
  });
});
