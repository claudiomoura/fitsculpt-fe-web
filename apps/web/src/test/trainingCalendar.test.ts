import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { clampDayKeyToPlanStart, clampDateNotBefore, normalizeToLocalStartOfDay, useTrainingCalendar } from "@/app/(app)/app/training/hooks/useTrainingCalendar";

describe("useTrainingCalendar", () => {
  it("normalizes dates to local start of day", () => {
    const value = normalizeToLocalStartOfDay(new Date("2026-03-16T18:45:00"));
    expect(value.getHours()).toBe(0);
    expect(value.getMinutes()).toBe(0);
  });

  it("clamps selected date to plan start date", () => {
    const minDate = new Date(2026, 2, 16);
    const selectedDate = new Date(2026, 2, 10);
    const result = clampDateNotBefore(selectedDate, minDate);
    expect(result.getTime()).toBe(new Date(2026, 2, 16).getTime());
  });

  it("clamps day query param to plan start", () => {
    const minDate = new Date(2026, 2, 16);
    expect(clampDayKeyToPlanStart("2026-03-10", minDate)).toBe("2026-03-16");
    expect(clampDayKeyToPlanStart("2026-03-20", minDate)).toBe("2026-03-20");
  });

  it("hides week dates before the plan start", () => {
    const { result } = renderHook(() => useTrainingCalendar(new Date(2026, 2, 18), new Date(2026, 2, 16)));
    expect(result.current.weekDates.every((date) => date.getTime() >= new Date(2026, 2, 16).getTime())).toBe(true);
  });

  it("returns hidden month cells before the plan start", () => {
    const { result } = renderHook(() => useTrainingCalendar(new Date(2026, 2, 18), new Date(2026, 2, 16)));
    const hiddenCells = result.current.monthDates.filter((value) => value === null);
    expect(hiddenCells.length).toBeGreaterThan(0);
  });
});
