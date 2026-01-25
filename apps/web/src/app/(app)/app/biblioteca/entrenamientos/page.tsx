import { getServerT } from "@/lib/serverI18n";
import LibraryTabs from "../LibraryTabs";
import TrainingLibraryClient from "./TrainingLibraryClient";

export default async function TrainingLibraryPage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <div className="form-stack">
          <h1 className="section-title">{t("app.libraryTitle")}</h1>
          <p className="section-subtitle">{t("app.librarySubtitle")}</p>
          <LibraryTabs active="training" />
        </div>
      </section>
      <TrainingLibraryClient />
    </div>
  );
}
