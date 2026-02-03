import { getServerT } from "@/lib/serverI18n";
import QuickActionsGrid from "@/components/today/QuickActionsGrid";

export default async function TodayPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{t("today.title")}</h1>
            <p className="section-subtitle">{t("today.subtitle")}</p>
          </div>
        </div>
      </section>
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">{t("today.quickActionsTitle")}</h2>
            <p className="section-subtitle">{t("today.quickActionsSubtitle")}</p>
          </div>
        </div>
        <QuickActionsGrid
          actions={[
            {
              id: "training",
              title: t("today.actions.openTraining"),
              description: t("today.actions.openTrainingDescription"),
              ctaLabel: t("today.actions.openTraining"),
              href: "/app/entrenamiento",
            },
            {
              id: "nutrition",
              title: t("today.actions.openNutrition"),
              description: t("today.actions.openNutritionDescription"),
              ctaLabel: t("today.actions.openNutrition"),
              href: "/app/nutricion",
            },
            {
              id: "weight",
              title: t("today.actions.recordWeight"),
              description: t("today.actions.recordWeightDescription"),
              ctaLabel: t("today.actions.recordWeight"),
              href: "/app/seguimiento#weight-entry",
            },
            {
              id: "library",
              title: t("today.actions.openLibrary"),
              description: t("today.actions.openLibraryDescription"),
              ctaLabel: t("today.actions.openLibrary"),
              href: "/app/biblioteca",
            },
          ]}
        />
      </section>
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">{t("today.summaryTitle")}</h2>
            <p className="section-subtitle">{t("today.summarySubtitle")}</p>
          </div>
        </div>
        <div className="today-summary-grid">
          <div className="feature-card today-summary-card">
            <p className="today-summary-label">{t("today.summaryTrainingTitle")}</p>
            <p className="today-summary-placeholder">{t("today.summaryTrainingPlaceholder")}</p>
          </div>
          <div className="feature-card today-summary-card">
            <p className="today-summary-label">{t("today.summaryNutritionTitle")}</p>
            <p className="today-summary-placeholder">{t("today.summaryNutritionPlaceholder")}</p>
          </div>
          <div className="feature-card today-summary-card">
            <p className="today-summary-label">{t("today.summaryWeightTitle")}</p>
            <p className="today-summary-placeholder">{t("today.summaryWeightPlaceholder")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
