import type { TrainingPlanDay } from "@/lib/types";

function toDateKey(date: Date): string {
  return `${date.getFullYear().toString().padStart(4, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

export function getDateCandidates(value: string): Set<string> {
  const candidates = new Set<string>();
  const normalizedValue = value.trim();
  if (!normalizedValue) return candidates;

  const directDateMatch = normalizedValue.match(/\d{4}-\d{2}-\d{2}/);
  if (directDateMatch) {
    candidates.add(directDateMatch[0]);
  }

  const parsedDate = new Date(normalizedValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    candidates.add(parsedDate.toISOString().slice(0, 10));
    candidates.add(toDateKey(parsedDate));
  }

  return candidates;
}

export function findTrainingPlanDayByQuery(days: TrainingPlanDay[], queryDay: string): TrainingPlanDay | null {
  const normalizedQuery = queryDay.trim();
  if (!normalizedQuery) return null;

  const queryCandidates = getDateCandidates(normalizedQuery);

  return days.find((dayItem) => {
    const itemCandidates = getDateCandidates(dayItem.date);

    if (queryCandidates.size > 0 && itemCandidates.size > 0) {
      for (const candidate of queryCandidates) {
        if (itemCandidates.has(candidate)) {
          return true;
        }
      }
    }

    return dayItem.date.startsWith(normalizedQuery);
  }) ?? null;
}
