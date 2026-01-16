import NutritionPlanClient from "./NutritionPlanClient";
import Link from "next/link";
import { copy } from "@/lib/i18n";

export default function NutritionPlanPage() {
  const c = copy.es;

  return (
    <div className="page">
      <section className="card">
        <div className="section-head">
          <div>
            <h1 className="section-title">{c.app.nutritionTitle}</h1>
            <p className="section-subtitle">{c.app.nutritionSubtitle}</p>
          </div>
          <Link href="/app/macros" className="btn secondary">
            {c.app.nutritionMacrosLink}
          </Link>
        </div>
      </section>
      <NutritionPlanClient />
    </div>
  );
}
