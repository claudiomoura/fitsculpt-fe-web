import TrainingPlanClient from "./TrainingPlanClient";
import { copy } from "@/lib/i18n";

export default function TrainingPlanPage() {
  const c = copy.es;

  return (
    <section>
      <h1>{c.app.trainingTitle}</h1>
      <p style={{ marginTop: 6 }}>{c.app.trainingSubtitle}</p>

      <div style={{ marginTop: 16 }}>
        <TrainingPlanClient />
      </div>
    </section>
  );
}
