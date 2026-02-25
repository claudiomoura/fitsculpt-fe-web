import { getServerT } from "@/lib/serverI18n";
import ExerciseLibraryClient from "./ExerciseLibraryClient";
import LibraryTabs from "./LibraryTabs";

export default async function ExerciseLibraryPage() {
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
            <LibraryTabs active="exercises" libraryType="fitness" />
          </div>
        </div>
      </section>
      <ExerciseLibraryClient />
    </div>
  );
}
