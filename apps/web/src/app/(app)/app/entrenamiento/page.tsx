import TrainingPlanClient from "./TrainingPlanClient";
import { copy } from "@/lib/i18n";

export default function TrainingPlanPage() {
  const c = copy.es;

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{c.app.trainingTitle}</h1>
        <p className="section-subtitle">{c.app.trainingSubtitle}</p>
      </section>
      <TrainingPlanClient />
    </div>
  );
}
