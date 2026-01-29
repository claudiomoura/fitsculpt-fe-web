import TrainingPlanClient from "./TrainingPlanClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";

export default async function TrainingPlanPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{t("app.trainingTitle")}</h1>
            <p className="section-subtitle">{t("app.trainingSubtitle")}</p>
          </div>
          <div className="page-header-actions">
            <ButtonLink href="/app/entrenamiento?ai=1">
              {t("training.aiGenerate")}
            </ButtonLink>
            <ButtonLink variant="secondary" href="/app/workouts">
              {t("training.manualCreate")}
            </ButtonLink>
          </div>
        </div>
      </section>
      <TrainingPlanClient />
    </div>
  );
}
