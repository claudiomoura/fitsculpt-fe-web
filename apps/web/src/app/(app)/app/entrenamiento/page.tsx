import TrainingPlanClient from "./TrainingPlanClient";
import { getServerT } from "@/lib/serverI18n";

export default function TrainingPlanPage() {
  const { t } = getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.trainingTitle")}</h1>
        <p className="section-subtitle">{t("app.trainingSubtitle")}</p>
      </section>
      <TrainingPlanClient />
    </div>
  );
}
