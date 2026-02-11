import { addDays, differenceInDays, startOfWeek } from "@/lib/calendar";

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

  const todayWeekStart = getWeekStart(new Date());
  const weekOffset = Math.floor(differenceInDays(selectedWeekStart, todayWeekStart) / 7);
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
