import { getServerT } from "@/lib/serverI18n";
import DietPlansClient from "../../dietas/DietPlansClient";
import LibraryTabs from "../LibraryTabs";

export default async function NutritionPlansLibraryPage() {
  const { t } = await getServerT();

  return (
    <div className="page" data-testid="nutrition-page-root">
      <section className="card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{t("app.libraryTitle")}</h1>
            <p className="section-subtitle">{t("app.librarySubtitle")}</p>
          </div>
          <div className="page-header-actions">
            <LibraryTabs active="nutritionPlans" libraryType="nutrition" />
          </div>
        </div>
      </section>
      <DietPlansClient />
    </div>
  );
}
