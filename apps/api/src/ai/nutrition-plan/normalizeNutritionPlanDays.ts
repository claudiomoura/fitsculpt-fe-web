export type NutritionDayMeal = {
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  ingredients: Array<{ name: string; grams: number }> | null;
};

export type NutritionDay = {
  date?: string;
  dayLabel: string;
  meals: NutritionDayMeal[];
};

export type NutritionPlanWithDays<TDay extends NutritionDay> = {
  startDate: string | null;
  days: TDay[];
};

export function toIsoDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getSpanishWeekdayLabel(date: Date) {
  const weekday = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

export function ensureNutritionDayCount<TDay extends NutritionDay>(days: TDay[], daysCount: number): TDay[] {
  if (days.length === 0) return days;
  if (days.length === daysCount) return days;

  const next: TDay[] = [];
  for (let i = 0; i < daysCount; i += 1) {
    const source = days[i % days.length];
    next.push({
      ...source,
      meals: source.meals.map((meal) => ({
        ...meal,
        macros: { ...meal.macros },
        ingredients: meal.ingredients ? meal.ingredients.map((ingredient) => ({ ...ingredient })) : null,
      })),
    });
  }

  return next;
}

export function normalizeNutritionPlanDays<TDay extends NutritionDay, TPlan extends NutritionPlanWithDays<TDay>>(
  plan: TPlan,
  startDate: Date,
  daysCount: number
): {
  plan: TPlan;
  alignmentIssues: Array<{ index: number; incomingDate: string | null; expectedDate: string }>;
} {
  const normalizedDays = ensureNutritionDayCount(plan.days, daysCount);
  const alignmentIssues: Array<{ index: number; incomingDate: string | null; expectedDate: string }> = [];

  const daysWithDates = normalizedDays.map((day, index) => {
    const expectedDate = new Date(startDate);
    expectedDate.setUTCDate(startDate.getUTCDate() + index);
    const expectedIsoDate = toIsoDateString(expectedDate);

    if (!day.date || day.date !== expectedIsoDate) {
      alignmentIssues.push({
        index,
        incomingDate: day.date ?? null,
        expectedDate: expectedIsoDate,
      });
    }

    return {
      ...day,
      date: expectedIsoDate,
      dayLabel: getSpanishWeekdayLabel(expectedDate),
    };
  });

  return {
    plan: {
      ...plan,
      startDate: toIsoDateString(startDate),
      days: daysWithDates,
    },
    alignmentIssues,
  };
}
