import NutritionPlanClient from "../NutritionPlanClient";
import { getServerT } from "@/lib/serverI18n";

export default async function NutritionPlanEditPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("nutrition.manualPlanTitle")}</h1>
        <p className="section-subtitle">{t("nutrition.manualPlanSubtitle")}</p>
      </section>
      <NutritionPlanClient mode="manual" />
    </div>
  );
}
