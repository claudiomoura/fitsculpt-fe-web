import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
  const mealLabel = data.meals === 1 ? t("today.mealLabel") : t("today.mealsLabel");

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
          {data.meals} {mealLabel}
          {typeof data.calories === "number" ? ` · ${data.calories} ${t("units.kcal")}` : ""}
        </p>
      </div>
      <div className="today-nutrition-list">
        {data.meals.map((meal, index) => {
          const typeLabel = meal.type ? mealTypeLabels[meal.type] : null;
          const fallbackKey = `${slugifyExerciseName(meal.title)}-${index}`;
          const itemKey = meal.key ?? fallbackKey;
          const isConsumed = meal.key ? consumedKeys.includes(meal.key) : false;
          const isDisabled = loading || hasError || !meal.key;

          return (
            <div key={itemKey} className="today-nutrition-item">
              <div className="today-nutrition-item-body">
                <div className="today-nutrition-item-title">{meal.title}</div>
                {typeLabel ? <p className="muted m-0">{typeLabel}</p> : null}
                {meal.description ? <p className="muted m-0">{meal.description}</p> : null}
              </div>
              <Button
                size="sm"
                variant={isConsumed ? "primary" : "secondary"}
                className="today-nutrition-toggle"
                disabled={isDisabled}
                onClick={() => {
                  if (!meal.key) return;
                  toggle(meal.key);
                }}
              >
                {isConsumed ? t("today.nutritionToggleConsumed") : t("today.nutritionToggleMark")}
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
