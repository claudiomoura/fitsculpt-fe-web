import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { getServerT } from "@/lib/serverI18n";
import TodaySummaryClient from "./TodaySummaryClient";

export default async function TodayPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("today.title")}</h1>
        <p className="section-subtitle">{t("today.subtitle")}</p>
      </section>
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">{t("quickActions.title")}</h2>
            <p className="section-subtitle">{t("quickActions.subtitle")}</p>
          </div>
        </div>
        <div className="quick-actions-grid">
          <div className="quick-action-card">
            <div>
              <p className="quick-action-title">{t("quickActions.recordWeight")}</p>
              <p className="quick-action-description">{t("quickActions.recordWeightDescription")}</p>
            </div>
            <ButtonLink as={Link} href="/app/seguimiento#weight-entry" className="quick-action-button">
              {t("quickActions.recordWeight")}
            </ButtonLink>
          </div>
        </div>
      </section>
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">{t("today.focusTitle")}</h2>
            <p className="section-subtitle">{t("today.focusSubtitle")}</p>
          </div>
        </div>
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
      <TodaySummaryClient />
    </div>
  );
}
