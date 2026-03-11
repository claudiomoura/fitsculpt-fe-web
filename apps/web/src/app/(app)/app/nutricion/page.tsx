import NutritionPlanClient from "./NutritionPlanClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { V0PageHero } from "@/components/surfaces/V0PageHero";

export default async function NutritionPlanPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <V0PageHero
        eyebrow={t("nav.nutrition")}
        title={t("app.nutritionTitle")}
        subtitle={t("app.nutritionSubtitle")}
        actions={
          <>
            <ButtonLink variant="secondary" href="/app/dietas">
              {t("dietPlans.title")}
            </ButtonLink>
            <ButtonLink variant="secondary" href="/app/macros">
              {t("app.nutritionMacrosLink")}
            </ButtonLink>
            <ButtonLink href="/app/nutricion?ai=1">{t("nutrition.aiGenerate")}</ButtonLink>
          </>
        }
      />
      <NutritionPlanClient />
    </div>
  );
}
