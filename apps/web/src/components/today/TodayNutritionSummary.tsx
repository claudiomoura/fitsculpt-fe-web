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

  return (
    <div className="stack-md">
      <div className="stack-sm">
        <strong>{t("today.nutritionSummaryTitle")}</strong>
        <p className="muted m-0">
          {data.meals} {t("today.mealsLabel")}
          {typeof data.calories === "number" ? ` · ${data.calories} kcal` : ""}
        </p>
      </div>
      {data.label ? <Badge>{data.label}</Badge> : null}
    </div>
  );
}

export type { TodayNutritionSummaryData };
