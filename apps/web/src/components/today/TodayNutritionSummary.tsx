import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import { useNutritionAdherence } from "@/lib/nutritionAdherence";
import { slugifyExerciseName } from "@/lib/slugify";
import type { NutritionMeal } from "@/lib/profile";

type NutritionSummaryItem = {
  key: string | null;
  title: string;
  description?: string;
  type?: NutritionMeal["type"];
};

type TodayNutritionSummaryData = {
  label?: string;
  meals: NutritionSummaryItem[];
  calories?: number;
  dayKey: string;
};

type TodayNutritionSummaryProps = {
  data: TodayNutritionSummaryData;
};

export function TodayNutritionSummary({ data }: TodayNutritionSummaryProps) {
  const { t } = useLanguage();
  const { notify } = useToast();

  const { isLoading, error, isConsumed, toggle } = useNutritionAdherence(data.dayKey);

  const totalMeals = data.meals.length;
  const mealLabel = totalMeals === 1 ? t("today.mealLabel") : t("today.mealsLabel");

  const consumedCount = data.meals.filter((meal) => (meal.key ? isConsumed(meal.key, data.dayKey) : false)).length;

  const mealTypeLabels: Record<NonNullable<NutritionMeal["type"]>, string> = {
    breakfast: t("nutrition.mealTypeBreakfast"),
    lunch: t("nutrition.mealTypeLunch"),
    dinner: t("nutrition.mealTypeDinner"),
    snack: t("nutrition.mealTypeSnack"),
  };

  return (
    <div className="stack-md">
      <div className="stack-sm">
        <div className="today-nutrition-header">
          <strong>{t("today.nutritionSummaryTitle")}</strong>
          {totalMeals > 0 ? (
            <span className="today-nutrition-consumed">
              {t("today.nutritionConsumedLabel")} {consumedCount}/{totalMeals}
            </span>
          ) : null}
        </div>
        <p className="muted m-0">
          {totalMeals} {mealLabel}
          {typeof data.calories === "number" ? ` · ${data.calories} ${t("units.kcal")}` : ""}
        </p>
      </div>
      <div className="today-nutrition-list">
         {data.meals.map((meal, index) => {
          const typeLabel = meal.type ? mealTypeLabels[meal.type] : null;
          const mealTitle = meal.title?.trim() || t("nutrition.mealTypeFallback");
          const fallbackKey = `${slugifyExerciseName(mealTitle)}-${index}`;
          const itemKey = meal.key ?? fallbackKey;

          const consumed = meal.key ? isConsumed(meal.key, data.dayKey) : false;
          const isDisabled = isLoading || error || !meal.key;

          const toggleLabel = consumed ? t("today.nutritionToggleConsumed") : t("today.nutritionToggleMark");

          return (
            <div key={itemKey} className="today-nutrition-item">
              <div className="today-nutrition-item-body">
                <div className="today-nutrition-item-title">{mealTitle}</div>
                {typeLabel ? <p className="muted m-0">{typeLabel}</p> : null}
                {meal.description ? <p className="muted m-0">{meal.description}</p> : null}
              </div>
              <Button
                size="sm"
                variant={consumed ? "primary" : "secondary"}
                className="today-nutrition-toggle"
                disabled={isDisabled}
                aria-pressed={consumed}
                aria-label={`${toggleLabel}: ${meal.title}`}
                onClick={() => {
                  if (!meal.key) return;
                  const nextConsumed = !consumed;

                  toggle(meal.key, data.dayKey);

                  if (nextConsumed) {
                    notify({
                      title: t("nutrition.adherenceToastTitle"),
                      description: t("nutrition.adherenceToastDescription"),
                    });
                  }
                }}
              >
                {toggleLabel}
              </Button>
            </div>
          );
        })}
      </div>
      {data.label ? <Badge>{data.label}</Badge> : null}
    </div>
  );
}

export type { TodayNutritionSummaryData };
