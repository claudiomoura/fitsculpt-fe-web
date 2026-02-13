import { addDays, differenceInDays, startOfWeek, toDateKey as toCalendarDateKey } from "@/lib/calendar";

export type CalendarDayEntry<TDay> = {
  day: TDay;
  index: number;
  date: Date;
};

type ProjectDaysForWeekArgs<TDay> = {
  entries: CalendarDayEntry<TDay>[];
  selectedWeekStart: Date;
  modelWeekStart: Date;
  maxProjectedWeeksAhead?: number;
};

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, 1);
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function toDateKey(date?: Date | null): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return toCalendarDateKey(date);
}

export function getWeekOffsetFromCurrent(selectedWeekStart: Date, currentDate = new Date()): number {
  const currentWeekStart = getWeekStart(currentDate);
  return Math.floor(differenceInDays(selectedWeekStart, currentWeekStart) / 7);
}

export function clampWeekOffset(weekOffset: number, maxProjectedWeeksAhead = 3): number {
  if (!Number.isFinite(weekOffset)) return 0;
  return Math.max(0, Math.min(maxProjectedWeeksAhead, Math.trunc(weekOffset)));
}

export function projectDaysForWeek<TDay>({
  entries,
  selectedWeekStart,
  modelWeekStart,
  maxProjectedWeeksAhead = 3,
}: ProjectDaysForWeekArgs<TDay>): { days: CalendarDayEntry<TDay>[]; isReplicated: boolean } {
  const selectedWeekEnd = addDays(selectedWeekStart, 6);
  const directDays = entries
    .filter((entry) => entry.date >= selectedWeekStart && entry.date <= selectedWeekEnd)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (directDays.length > 0) {
    return { days: directDays, isReplicated: false };
  }

  const weekOffset = getWeekOffsetFromCurrent(selectedWeekStart);
  if (weekOffset < 1 || weekOffset > maxProjectedWeeksAhead) {
    return { days: [], isReplicated: false };
  }

  const modelWeekEnd = addDays(modelWeekStart, 6);
  const modelWeekDays = entries
    .filter((entry) => entry.date >= modelWeekStart && entry.date <= modelWeekEnd)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (modelWeekDays.length === 0) {
    return { days: [], isReplicated: false };
  }

  const projectedDays = modelWeekDays.map((entry, index) => ({
    ...entry,
    date: addDays(selectedWeekStart, index),
  }));

  return { days: projectedDays, isReplicated: true };
}
