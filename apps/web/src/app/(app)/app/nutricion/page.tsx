import NutritionPlanClient from "./NutritionPlanClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { V0Card, V0NutritionShell, V0SectionHeader } from "@/components/v0";

export default async function NutritionPlanPage() {
  const { t } = await getServerT();

  return (
    <V0NutritionShell title={t("app.nutritionTitle")}>
      <div className="page">
        <V0Card>
          <V0SectionHeader title={t("nav.nutrition")} />
          <div className="v0-route-shell__actions mt-4" aria-label={t("nav.nutrition")}>
            <ButtonLink variant="secondary" href="/app/dietas">
              {t("dietPlans.title")}
            </ButtonLink>
            <ButtonLink variant="secondary" href="/app/macros">
              {t("app.nutritionMacrosLink")}
            </ButtonLink>
            <ButtonLink href="/app/nutricion?ai=1">{t("nutrition.aiGenerate")}</ButtonLink>
          </div>
        </V0Card>
        <V0Card className="p-0 [&_.card]:border-white/10 [&_.card]:bg-white/5 [&_.ui-card]:border-white/10 [&_.ui-card]:bg-white/5">
          <NutritionPlanClient />
        </V0Card>
      </div>
    </V0NutritionShell>
  );
}
