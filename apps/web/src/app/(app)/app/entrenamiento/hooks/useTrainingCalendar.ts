import { useMemo } from "react";
import { buildMonthGrid, startOfWeek, toDateKey } from "@/lib/calendar";

export function normalizeToLocalStartOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function clampDateNotBefore(date: Date, minDate?: Date | null): Date {
  const normalizedDate = normalizeToLocalStartOfDay(date);
  const normalizedMinDate = minDate ? normalizeToLocalStartOfDay(minDate) : null;
  if (!normalizedMinDate) return normalizedDate;
  return normalizedDate.getTime() < normalizedMinDate.getTime() ? normalizedMinDate : normalizedDate;
}

export function getPlanStartDate(planStartDate?: Date | null): Date | null {
  if (!planStartDate || Number.isNaN(planStartDate.getTime())) return null;
  return normalizeToLocalStartOfDay(planStartDate);
}

export function clampDayKeyToPlanStart(dayKey: string | null, planStartDate?: Date | null): string | null {
  if (!dayKey) return null;
  const parsed = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(clampDateNotBefore(parsed, planStartDate));
}

export function useTrainingCalendar(selectedDate: Date, planStartDate?: Date | null) {
  const normalizedPlanStartDate = useMemo(() => getPlanStartDate(planStartDate), [planStartDate]);
  const clampedSelectedDate = useMemo(
    () => clampDateNotBefore(selectedDate, normalizedPlanStartDate),
    [selectedDate, normalizedPlanStartDate]
  );
  const weekStart = useMemo(() => startOfWeek(clampedSelectedDate), [clampedSelectedDate]);
  const minWeekStart = useMemo(
    () => (normalizedPlanStartDate ? startOfWeek(normalizedPlanStartDate) : null),
    [normalizedPlanStartDate]
  );
  const canGoPrevWeek = useMemo(() => {
    if (!minWeekStart) return true;
    return weekStart.getTime() > minWeekStart.getTime();
  }, [minWeekStart, weekStart]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    }).filter((date) => !normalizedPlanStartDate || date.getTime() >= normalizedPlanStartDate.getTime()),
    [normalizedPlanStartDate, weekStart]
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
