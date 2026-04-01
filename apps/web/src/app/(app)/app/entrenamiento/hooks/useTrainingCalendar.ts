import { useMemo } from "react";
import { buildMonthGrid, startOfWeek, toDateKey } from "@/lib/calendar";

export function normalizeToUtcStartOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

export function clampDateNotBefore(date: Date, minDate?: Date | null): Date {
  const normalizedDate = normalizeToUtcStartOfDay(date);
  const normalizedMinDate = minDate ? normalizeToUtcStartOfDay(minDate) : null;
  if (!normalizedMinDate) return normalizedDate;
  return normalizedDate.getTime() < normalizedMinDate.getTime() ? normalizedMinDate : normalizedDate;
}

export function getPlanStartDate(planStartDate?: Date | null): Date | null {
  if (!planStartDate || Number.isNaN(planStartDate.getTime())) return null;
  return normalizeToUtcStartOfDay(planStartDate);
}

export function clampDayKeyToPlanStart(dayKey: string | null, planStartDate?: Date | null): string | null {
  if (!dayKey) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dayKey);
  if (!match) return null;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(clampDateNotBefore(parsed, planStartDate));
}

export function useTrainingCalendar(selectedDate: Date, planStartDate?: Date | null) {
  const normalizedPlanStartDate = useMemo(() => getPlanStartDate(planStartDate), [planStartDate]);
  const minWeekStart = useMemo(
    () => (normalizedPlanStartDate ? startOfWeek(normalizedPlanStartDate) : null),
    [normalizedPlanStartDate]
  );
  const clampedSelectedDate = useMemo(
    () => clampDateNotBefore(selectedDate, minWeekStart),
    [selectedDate, minWeekStart]
  );
  const weekStart = useMemo(() => startOfWeek(clampedSelectedDate), [clampedSelectedDate]);
  const canGoPrevWeek = useMemo(() => {
    if (!minWeekStart) return true;
    return weekStart.getTime() > minWeekStart.getTime();
  }, [minWeekStart, weekStart]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + index);
      return date;
    }),
    [weekStart]
  );

  const monthDates = useMemo(
    () => buildMonthGrid(clampedSelectedDate).map((date) => {
      if (normalizedPlanStartDate && date.getTime() < normalizedPlanStartDate.getTime()) {
        return null;
      }
      return date;
    }),
    [clampedSelectedDate, normalizedPlanStartDate]
  );

  return {
    planStartDate: normalizedPlanStartDate,
    clampedSelectedDate,
    weekStart,
    minWeekStart,
    canGoPrevWeek,
    weekDates,
    monthDates,
  };
}
