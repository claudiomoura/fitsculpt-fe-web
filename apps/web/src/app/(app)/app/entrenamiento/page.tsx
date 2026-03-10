import TrainingPlanClient from "./TrainingPlanClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { V0PageHero } from "@/components/surfaces/V0PageHero";

export default async function TrainingPlanPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <V0PageHero
        eyebrow={t("nav.trainingPlan")}
        title={t("app.trainingTitle")}
        subtitle={t("app.trainingSubtitle")}
        actions={
          <>
            <ButtonLink variant="secondary" href="/app/biblioteca/entrenamientos">
              {t("training.openFromLibrary")}
            </ButtonLink>
            <ButtonLink href="/app/entrenamiento?ai=1">{t("training.aiGenerate")}</ButtonLink>
          </>
        }
      />
      <TrainingPlanClient mode="suggested" />
    </div>
  );
}
