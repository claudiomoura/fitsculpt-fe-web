import TrainingPlanClient from "./TrainingPlanClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { V0TrainingShell } from "@/components/v0/screens/V0TrainingShell";

export default async function TrainingPlanPage() {
  const { t } = await getServerT();

  return (
    <V0TrainingShell title={t("app.trainingTitle")}>
      <div className="page">
        <div className="v0-route-shell__actions" aria-label={t("nav.trainingPlan")}>
          <ButtonLink variant="secondary" href="/app/biblioteca/entrenamientos">
            {t("training.openFromLibrary")}
          </ButtonLink>
          <ButtonLink href="/app/entrenamiento?ai=1">{t("training.aiGenerate")}</ButtonLink>
        </div>
        <TrainingPlanClient mode="suggested" />
      </div>
    </V0TrainingShell>
  );
}
