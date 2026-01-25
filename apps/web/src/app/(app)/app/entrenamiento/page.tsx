import Link from "next/link";
import TrainingPlanClient from "./TrainingPlanClient";
import { getServerT } from "@/lib/serverI18n";

export default async function TrainingPlanPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.trainingTitle")}</h1>
        <p className="section-subtitle">{t("app.trainingSubtitle")}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn" href="/app/entrenamiento?ai=1">
            {t("training.aiGenerate")}
          </Link>
          <Link className="btn secondary" href="/app/workouts">
            {t("training.manualCreate")}
          </Link>
        </div>
      </section>
      <TrainingPlanClient />
    </div>
  );
}
