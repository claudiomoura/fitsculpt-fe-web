export function dayKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dayKey(value?: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : dayKeyFromDate(value);
  }

  const normalized = value.trim();
  const exactDayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (exactDayMatch) {
    return `${exactDayMatch[1]}-${exactDayMatch[2]}-${exactDayMatch[3]}`;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : dayKeyFromDate(parsed);
}

export function todayLocalDayKey(): string {
  return dayKeyFromDate(new Date());
}
