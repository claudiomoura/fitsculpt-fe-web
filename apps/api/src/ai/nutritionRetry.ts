export type NutritionRetryContext = {
  reason?: unknown;
  dayLabel?: unknown;
  mealTitle?: unknown;
  expected?: unknown;
  actual?: unknown;
  tolerance?: unknown;
  diff?: unknown;
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildRetryFeedbackFromContext(context: NutritionRetryContext): string {
  const reason = typeof context.reason === "string" ? context.reason : null;
  const dayLabel = typeof context.dayLabel === "string" ? context.dayLabel : "día desconocido";
  const diff = (context.diff ?? {}) as Record<string, unknown>;
  const expected = asNumber(context.expected) ?? asNumber(diff.expected);
  const actual = asNumber(context.actual) ?? asNumber(diff.actual);
  const tolerance = asNumber(context.tolerance) ?? asNumber(diff.tolerance);

  if (!reason || expected === null || actual === null) return "";
  return `${reason} en ${dayLabel}: expected=${expected}, actual=${actual}${tolerance !== null ? `, tolerance=±${tolerance}` : ""}`;
}

export function buildTwoMealSplitRetryInstruction(context: NutritionRetryContext): string {
  const reason = typeof context.reason === "string" ? context.reason : null;
  if (reason !== "TWO_MEAL_SPLIT_MISMATCH") return "";

  const dayLabel = typeof context.dayLabel === "string" ? context.dayLabel : "día desconocido";
  const mealTitle = typeof context.mealTitle === "string" ? context.mealTitle : "comida desconocida";
  const diff = (context.diff ?? {}) as Record<string, unknown>;
  const expected = asNumber(context.expected) ?? asNumber(diff.expected);
  const actual = asNumber(context.actual) ?? asNumber(diff.actual);
  const tolerance = asNumber(context.tolerance) ?? asNumber(diff.tolerance);

  if (expected === null || actual === null || tolerance === null) return "";

  return `REINTENTO FOCALIZADO TWO_MEAL_SPLIT_MISMATCH: dayLabel=${dayLabel}, mealTitle=${mealTitle}, expected=${expected}, actual=${actual}, tolerance=±${tolerance}. Ajusta SOLO esa comida para que sus calorías queden dentro del rango permitido y mantén el resto del plan intacto.`;
}

export function buildMealKcalGuidance(targetKcal: number, mealsPerDay: number, tolerance: number): string {
  const expectedPerMeal = Math.round(targetKcal / mealsPerDay);
  if (mealsPerDay === 2) {
    return `OBJETIVO POR COMIDA (2 comidas/día): targetKcal total=${targetKcal}, expected por comida=${expectedPerMeal} kcal (round(targetKcal/mealsPerDay)), tolerancia por comida=±${tolerance} kcal. REGLA DURA: cada comida debe quedar dentro de tolerancia.`;
  }

  return `OBJETIVO POR COMIDA: targetKcal total=${targetKcal}, mealsPerDay=${mealsPerDay}, expected por comida≈${expectedPerMeal} kcal, tolerancia por comida=±${tolerance} kcal. REGLA DURA: cada comida debe quedar dentro de tolerancia.`;
}
