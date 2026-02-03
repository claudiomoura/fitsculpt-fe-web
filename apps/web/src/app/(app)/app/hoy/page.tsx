import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { getServerT } from "@/lib/serverI18n";
import TodaySummaryClient from "./TodaySummaryClient";

type QuickAction = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  href?: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "training",
    titleKey: "quickActions.openTraining",
    descriptionKey: "quickActions.openTrainingDescription",
    href: "/app/entrenamiento",
  },
  {
    id: "nutrition",
    titleKey: "quickActions.openNutrition",
    descriptionKey: "quickActions.openNutritionDescription",
    href: "/app/nutricion",
  },
  {
    id: "weight",
    titleKey: "quickActions.recordWeight",
    descriptionKey: "quickActions.recordWeightDescription",
    href: "/app/seguimiento#weight-entry",
  },
  {
    id: "library",
    titleKey: "quickActions.openLibrary",
    descriptionKey: "quickActions.openLibraryDescription",
    href: "/app/biblioteca",
  },
];

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
        <div className="quick-actions-grid">
          {QUICK_ACTIONS.map((action) => (
            <div key={action.id} className="quick-action-card">
              <div>
                <p className="quick-action-title">{t(action.titleKey)}</p>
                <p className="quick-action-description">{t(action.descriptionKey)}</p>
              </div>
              {action.href ? (
                <ButtonLink as={Link} href={action.href} size="lg" className="quick-action-button">
                  {t("quickActions.open")}
                </ButtonLink>
              ) : (
                <Button size="lg" disabled className="quick-action-button">
                  {t("quickActions.comingSoon")}
                </Button>
              )}
            </div>
          ))}
        </div>
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
