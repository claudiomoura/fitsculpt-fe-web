import Link from "next/link";
import { getServerT } from "@/lib/serverI18n";

export default async function TodayPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("today.title")}</h1>
        <p className="section-subtitle">{t("today.subtitle")}</p>
      </section>
      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>
          {t("quickActions.title")}
        </h2>
        <p className="section-subtitle">{t("quickActions.subtitle")}</p>
        <div className="feature-card" style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <strong>{t("quickActions.recordWeight")}</strong>
            <span className="muted">{t("quickActions.recordWeightDescription")}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn" href="/app/seguimiento#weight-entry">
              {t("quickActions.recordWeight")}
            </Link>
          </div>
        </div>
      </section>
      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>
          {t("today.focusTitle")}
        </h2>
        <p className="section-subtitle">{t("today.focusSubtitle")}</p>
        <div className="today-highlight">
          <div>
            <p className="today-highlight-label">{t("today.focusPlan")}</p>
            <p className="today-highlight-value">{t("today.focusPlanValue")}</p>
          </div>
          <div>
            <p className="today-highlight-label">{t("today.focusNutrition")}</p>
            <p className="today-highlight-value">{t("today.focusNutritionValue")}</p>
          </div>
          <div>
            <p className="today-highlight-label">{t("today.focusRecovery")}</p>
            <p className="today-highlight-value">{t("today.focusRecoveryValue")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
