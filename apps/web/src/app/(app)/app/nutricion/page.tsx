import NutritionPlanClient from "./NutritionPlanClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { V0NutritionShell } from "@/components/v0";

export default async function NutritionPlanPage() {
  const { t } = await getServerT();

  return (
    <V0NutritionShell title={t("app.nutritionTitle")}>
      <div className="page">
        <div className="v0-route-shell__actions" aria-label={t("nav.nutrition")}>
          <ButtonLink variant="secondary" href="/app/dietas">
            {t("dietPlans.title")}
          </ButtonLink>
          <ButtonLink variant="secondary" href="/app/macros">
            {t("app.nutritionMacrosLink")}
          </ButtonLink>
          <ButtonLink href="/app/nutricion?ai=1">{t("nutrition.aiGenerate")}</ButtonLink>
        </div>
        <NutritionPlanClient />
      </div>
    </V0NutritionShell>
  );
}
