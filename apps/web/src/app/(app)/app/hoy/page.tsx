import { getServerT } from "@/lib/serverI18n";
import TodayQuickActionsClient from "./TodayQuickActionsClient";

export default async function TodayPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("today.title")}</h1>
        <p className="section-subtitle">{t("today.subtitle")}</p>
      </section>
      <section className="card">
        <div className="section-head section-head--card">
          <div>
            <h2 className="section-title section-title-sm">{t("quickActions.title")}</h2>
            <p className="section-subtitle">{t("quickActions.subtitle")}</p>
          </div>
        </div>
        <TodayQuickActionsClient />
      </section>
    </div>
  );
}
