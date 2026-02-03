import { Badge } from "@/components/ui/Badge";
import { useLanguage } from "@/context/LanguageProvider";

type TodayNutritionSummaryData = {
  label?: string;
  meals: number;
  calories?: number;
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
        <strong>{t("today.nutritionSummaryTitle")}</strong>
        <p className="muted m-0">
          {data.meals} {mealLabel}
          {typeof data.calories === "number" ? ` · ${data.calories} ${t("units.kcal")}` : ""}
        </p>
      </div>
      {data.label ? <Badge>{data.label}</Badge> : null}
    </div>
  );
}

export type { TodayNutritionSummaryData };
