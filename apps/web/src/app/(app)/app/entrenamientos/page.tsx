import WorkoutsClient from "../workouts/WorkoutsClient";
import { getServerT } from "@/lib/serverI18n";

export default async function EntrenamientosPage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.workoutsTitle")}</h1>
        <p className="section-subtitle">{t("app.workoutsSubtitle")}</p>
      </section>
      <WorkoutsClient />
    </div>
  );
}
