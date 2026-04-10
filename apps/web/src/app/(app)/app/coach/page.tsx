import CoachClient from "./CoachClient";
import { getServerT } from "@/lib/serverI18n";

export default async function CoachPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.coachTitle")}</h1>
        <p className="section-subtitle">{t("app.coachSubtitle")}</p>
      </section>
      <CoachClient />
    </div>
  );
}
