import { addDays, parseDate } from "@/lib/calendar";

export type WeightLog = {
  date: Date;
  weightKg: number;
};

export type WeightWindowSummary = {
  start: Date;
  end: Date;
  latest: WeightLog;
  entries: WeightLog[];
};

export type WeightProgressSummary = {
  current: WeightWindowSummary | null;
  previous: WeightWindowSummary | null;
  deltaKg: number | null;
};

export function hasSufficientWeightProgress(summary: WeightProgressSummary): boolean {
  return Boolean(summary.current?.entries.length && summary.previous?.entries.length);
}

const toStartOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export function normalizeWeightLogs(checkins?: Array<Record<string, unknown>> | null): WeightLog[] {
  if (!Array.isArray(checkins)) return [];
  return checkins.reduce<WeightLog[]>((acc, entry) => {
    const dateValue = typeof entry.date === "string" ? entry.date : null;
    const parsedDate = dateValue ? parseDate(dateValue) : null;
    const weightValue =
      typeof entry.weightKg === "number" || typeof entry.weightKg === "string"
        ? Number(entry.weightKg)
        : Number.NaN;
    if (!parsedDate || Number.isNaN(weightValue)) return acc;
    acc.push({ date: toStartOfDay(parsedDate), weightKg: weightValue });
    return acc;
  }, []);
}

const buildWindowSummary = (logs: WeightLog[], start: Date, end: Date): WeightWindowSummary | null => {
  const entries = logs.filter((log) => log.date >= start && log.date <= end);
  if (entries.length === 0) return null;
  const latest = entries.reduce((current, log) => (log.date > current.date ? log : current), entries[0]);
  return { start, end, latest, entries };
};

export function buildWeightProgressSummary(logs: WeightLog[], now: Date = new Date()): WeightProgressSummary {
  const today = toStartOfDay(now);
  const currentStart = addDays(today, -6);
  const currentEnd = today;
  const previousStart = addDays(currentStart, -7);
  const previousEnd = addDays(currentStart, -1);
  const current = buildWindowSummary(logs, currentStart, currentEnd);
  const previous = buildWindowSummary(logs, previousStart, previousEnd);
  const deltaKg = current && previous ? current.latest.weightKg - previous.latest.weightKg : null;
  return { current, previous, deltaKg };
}
