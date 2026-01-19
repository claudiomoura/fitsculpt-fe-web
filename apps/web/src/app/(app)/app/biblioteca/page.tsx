import { getServerT } from "@/lib/serverI18n";
import ExerciseLibraryClient from "./ExerciseLibraryClient";

export default function ExerciseLibraryPage() {
  const { t } = getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.libraryTitle")}</h1>
        <p className="section-subtitle">{t("app.librarySubtitle")}</p>
      </section>
      <ExerciseLibraryClient />
    </div>
  );
}
