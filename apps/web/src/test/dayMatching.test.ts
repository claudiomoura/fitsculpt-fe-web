import { describe, expect, it } from "vitest";
import { findTrainingPlanDayByQuery, getDateCandidates } from "@/components/trainer/plans/dayMatching";
import type { TrainingPlanDay } from "@/lib/types";

describe("dayMatching", () => {
  it("extracts multiple date candidates from timezone-aware strings", () => {
    const candidates = getDateCandidates("2026-02-20T23:30:00-02:00");

    expect(candidates.has("2026-02-20")).toBe(true);
    expect(candidates.has("2026-02-21")).toBe(true);
  });

  it("finds a day even when API date carries timezone offset", () => {
    const days: TrainingPlanDay[] = [
      {
        id: "day-1",
        date: "2026-02-20T23:30:00-02:00",
        label: "Sábado",
        focus: "full body",
        duration: 45,
        exercises: [],
      },
    ];

    const selected = findTrainingPlanDayByQuery(days, "2026-02-21");

    expect(selected?.id).toBe("day-1");
  });
});
