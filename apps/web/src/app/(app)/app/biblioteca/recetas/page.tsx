import { getServerT } from "@/lib/serverI18n";
import LibraryTabs from "../LibraryTabs";
import RecipeLibraryClient from "./RecipeLibraryClient";

export default async function RecipeLibraryPage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{t("app.libraryTitle")}</h1>
            <p className="section-subtitle">{t("app.librarySubtitle")}</p>
          </div>
          <div className="page-header-actions">
            <LibraryTabs active="recipes" libraryType="nutrition" />
          </div>
        </div>
      </section>
      <RecipeLibraryClient />
    </div>
  );
}
