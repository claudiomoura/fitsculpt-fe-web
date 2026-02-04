import { getServerT } from "@/lib/serverI18n";
import TodaySummaryClient from "./TodaySummaryClient";
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
      <section className="card">
        <div className="section-head section-head--card">
          <div>
            <h2 className="section-title section-title-sm">{t("today.focusTitle")}</h2>
            <p className="section-subtitle">{t("today.focusSubtitle")}</p>
          </div>
        </div>
        <div className="today-highlight">
          <div className="today-highlight-item">
            <p className="today-highlight-label">{t("today.focusPlan")}</p>
            <p className="today-highlight-value">{t("today.focusPlanValue")}</p>
          </div>
          <div className="today-highlight-item">
            <p className="today-highlight-label">{t("today.focusNutrition")}</p>
            <p className="today-highlight-value">{t("today.focusNutritionValue")}</p>
          </div>
          <div className="today-highlight-item">
            <p className="today-highlight-label">{t("today.focusRecovery")}</p>
            <p className="today-highlight-value">{t("today.focusRecoveryValue")}</p>
          </div>
        </div>
      </section>
      <TodaySummaryClient />
    </div>
  );
}
