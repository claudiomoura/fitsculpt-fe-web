import NutritionPlanClient from "./NutritionPlanClient";
import Link from "next/link";
import { getServerT } from "@/lib/serverI18n";

export default async function NutritionPlanPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <div className="section-head">
          <div>
            <h1 className="section-title">{t("app.nutritionTitle")}</h1>
            <p className="section-subtitle">{t("app.nutritionSubtitle")}</p>
          </div>
          <Link href="/app/macros" className="btn secondary">
            {t("app.nutritionMacrosLink")}
          </Link>
        </div>
      </section>
      <NutritionPlanClient />
    </div>
  );
}
