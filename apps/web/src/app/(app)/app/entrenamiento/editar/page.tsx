import TrainingPlanClient from "../TrainingPlanClient";
import { getServerT } from "@/lib/serverI18n";

export default async function TrainingPlanEditPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("training.manualPlanTitle")}</h1>
        <p className="section-subtitle">{t("training.manualPlanSubtitle")}</p>
      </section>
      <TrainingPlanClient mode="manual" />
    </div>
  );
}
