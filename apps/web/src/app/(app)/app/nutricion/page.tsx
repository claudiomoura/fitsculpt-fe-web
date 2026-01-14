import NutritionPlanClient from "./NutritionPlanClient";
import { copy } from "@/lib/i18n";

export default function NutritionPage() {
  const c = copy.es;

  return (
    <section>
      <h1>{c.app.nutritionTitle}</h1>
      <p style={{ marginTop: 6 }}>{c.app.nutritionSubtitle}</p>

      <div style={{ marginTop: 16 }}>
        <NutritionPlanClient />
      </div>
    </section>
  );
}
