export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(Date.UTC(year, month, day));
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const day = date.getUTCDay();
  const diff = (day + 7 - weekStartsOn) % 7;
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - diff);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function buildMonthGrid(date: Date, weekStartsOn = 1): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, weekStartsOn);
  const gridEnd = addDays(startOfWeek(monthEnd, weekStartsOn), 6);
  const days: Date[] = [];
  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function differenceInDays(later: Date, earlier: Date): number {
  const utcLater = Date.UTC(later.getUTCFullYear(), later.getUTCMonth(), later.getUTCDate());
  const utcEarlier = Date.UTC(earlier.getUTCFullYear(), earlier.getUTCMonth(), earlier.getUTCDate());
  return Math.floor((utcLater - utcEarlier) / 86_400_000);
}
