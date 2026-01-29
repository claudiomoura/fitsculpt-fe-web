import NutritionPlanClient from "./NutritionPlanClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";

export default async function NutritionPlanPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{t("app.nutritionTitle")}</h1>
            <p className="section-subtitle">{t("app.nutritionSubtitle")}</p>
          </div>
          <div className="page-header-actions">
            <ButtonLink variant="secondary" href="/app/macros">
              {t("app.nutritionMacrosLink")}
            </ButtonLink>
            <ButtonLink href="/app/nutricion?ai=1">
              {t("nutrition.aiGenerate")}
            </ButtonLink>
          </div>
        </div>
      </section>
      <NutritionPlanClient />
    </div>
  );
}
