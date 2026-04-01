import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { clampDayKeyToPlanStart, clampDateNotBefore, normalizeToUtcStartOfDay, useTrainingCalendar } from "@/app/(app)/app/entrenamiento/hooks/useTrainingCalendar";

describe("useTrainingCalendar", () => {
  it("normalizes dates to UTC start of day", () => {
    const value = normalizeToUtcStartOfDay(new Date("2026-03-16T18:45:00"));
    expect(value.getUTCHours()).toBe(0);
    expect(value.getUTCMinutes()).toBe(0);
  });

  it("clamps selected date to plan start date", () => {
    const minDate = new Date(Date.UTC(2026, 2, 16));
    const selectedDate = new Date(Date.UTC(2026, 2, 10));
    const result = clampDateNotBefore(selectedDate, minDate);
    expect(result.getTime()).toBe(new Date(Date.UTC(2026, 2, 16)).getTime());
  });

  it("clamps day query param to plan start", () => {
    const minDate = new Date(Date.UTC(2026, 2, 16));
    expect(clampDayKeyToPlanStart("2026-03-10", minDate)).toBe("2026-03-16");
    expect(clampDayKeyToPlanStart("2026-03-20", minDate)).toBe("2026-03-20");
  });

  it("keeps the full monday-sunday strip for the first visible week", () => {
    const { result } = renderHook(() => useTrainingCalendar(new Date(Date.UTC(2026, 2, 18)), new Date(Date.UTC(2026, 2, 16))));
    expect(result.current.weekDates).toHaveLength(7);
    expect(result.current.weekDates[0]?.getTime()).toBe(new Date(Date.UTC(2026, 2, 16)).getTime());
    expect(result.current.weekDates[6]?.getTime()).toBe(new Date(Date.UTC(2026, 2, 22)).getTime());
  });

  it("returns hidden month cells before the plan start", () => {
    const { result } = renderHook(() => useTrainingCalendar(new Date(Date.UTC(2026, 2, 18)), new Date(Date.UTC(2026, 2, 16))));
    const hiddenCells = result.current.monthDates.filter((value) => value === null);
    expect(hiddenCells.length).toBeGreaterThan(0);
  });
});
