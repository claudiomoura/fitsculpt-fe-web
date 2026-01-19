import { getServerT } from "@/lib/serverI18n";
import ExerciseLibraryClient from "./ExerciseLibraryClient";

export default async function ExerciseLibraryPage() {
  const { t } = await getServerT();
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
