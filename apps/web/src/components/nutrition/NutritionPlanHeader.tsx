"use client";

import Link from "next/link";
import { Badge } from "@/design-system/components/Badge";
import { Icon } from "@/design-system/components/Icon";
import { Accordion } from "@/design-system/components";
import type { NutritionPlanData } from "@/lib/profile";

type NutritionPlanHeaderProps = {
  visiblePlan: NutritionPlanData | null;
  assignedPlanTitle: string | null;
  activePlanTitle: string | null;
  activePlanSourceLabel: string;
  aiTokenBalance: number | null;
  aiTokenRenewalAt: string | null;
  highlightedConsumedTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  highlightedTargetCalories: number | null;
  highlightedRemainingCalories: number | null;
  mealsProgress: number;
  mealsCompletedCount: number;
  highlightedMealsCount: number;
  dayLabel: string;
  profile: {
    weightKg?: number;
    heightCm?: number;
    activity?: string;
    goal?: string;
    nutritionPreferences: {
      dietType: string;
      mealDistribution: { preset: string };
      allergies: string[];
      dietaryPrefs: string;
      preferredFoods: string;
      dislikedFoods: string;
      mealsPerDay?: number;
      cookingTime?: string;
    };
  } | null;
  isPlanDetailsOpen: boolean;
  exportMessage: string | null;
  exportMessageTone: "success" | "warning";
  t: (key: string) => string;
  safeT: (key: string, fallback: string) => string;
  localeCode: string;
  onScrollToPlanDetails: () => void;
  onMarkAllComplete: () => void;
  onTogglePlanDetails: () => void;
  onExportCsv: () => void;
  onCopyShoppingList: () => void;
  allMealsLogged: boolean;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

export function NutritionPlanHeader({
  visiblePlan,
  assignedPlanTitle,
  activePlanTitle,
  activePlanSourceLabel,
  aiTokenBalance,
  aiTokenRenewalAt,
  highlightedConsumedTotals,
  highlightedTargetCalories,
  highlightedRemainingCalories,
  mealsProgress,
  mealsCompletedCount,
  highlightedMealsCount,
  dayLabel,
  profile,
  isPlanDetailsOpen,
  exportMessage,
  exportMessageTone,
  t,
  safeT,
  localeCode,
  onScrollToPlanDetails,
  onMarkAllComplete,
  onTogglePlanDetails,
  onExportCsv,
  onCopyShoppingList,
  allMealsLogged,
}: NutritionPlanHeaderProps) {
  const planTitle =
    activePlanTitle ?? safeT("nutrition.mealsTitle", "Comidas del día");
  const getFeedbackClassName = (tone: "success" | "warning") =>
    tone === "warning"
      ? "status-card status-card--warning"
      : "status-card status-card--success";

  return (
    <>
      {/* Hero card */}
      <div className="card premium-hero-card relative mb-5 overflow-hidden rounded-3xl nutrition-summary-hero-card">
        <div className="p-6">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border"
            style={{
              background: "color-mix(in srgb, var(--accent) 14%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
            }}
          >
            <Icon name="chef-hat" size={22} className="text-accent" />
          </div>

          <div className="mt-3">
            <h2 className="m-0 text-[1.9rem] font-semibold leading-tight text-primary">
              {planTitle}
            </h2>
            <p className="m-0 mt-1 text-sm text-muted">{dayLabel}</p>
          </div>

          {highlightedMealsCount > 0 ? (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className={`btn rounded-xl h-11 min-w-[148px] px-5 font-semibold ${allMealsLogged ? "secondary" : ""}`}
                disabled={allMealsLogged}
                aria-disabled={allMealsLogged}
                onClick={onMarkAllComplete}
              >
                {!allMealsLogged ? <Icon name="check" size={16} /> : null}
                {allMealsLogged
                  ? t("nutrition.quickLogButtonConsumed")
                  : safeT("nutrition.markAllComplete", "Marcar completado")}
              </button>
              <button
                type="button"
                className="btn secondary fit-content rounded-xl h-9 px-3 text-xs"
                onClick={onScrollToPlanDetails}
              >
                <Icon name="info" size={16} />
                {safeT("nutrition.planDetailsCta", "Detalles")}
              </button>
            </div>
          ) : null}

          {highlightedTargetCalories !== null ? (
            <p className="m-0 mt-4 text-sm text-muted">
              Objetivo diario: {highlightedTargetCalories} {t("units.kcal")}
            </p>
          ) : null}

          <div
            className="mt-3 h-2 w-full rounded-full"
            style={{ background: "var(--bg-muted)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${mealsProgress}%`,
                background:
                  "linear-gradient(90deg, var(--accent), var(--accent-strong))",
              }}
            />
          </div>

          <p className="m-0 mt-3 text-sm text-primary">
            {mealsCompletedCount}/{highlightedMealsCount}{" "}
            {safeT("nutrition.mealsTitle", "comidas").toLowerCase()}
          </p>
        </div>
      </div>

      {/* Plan details section */}
      {profile && (
        <section className="card premium-surface-card surface-content-card nutrition-plan-details-card">
          <div className="section-head section-head-actions">
            <div>
              <h2 className="section-title section-title-sm">
                {t("nutrition.planDetails.title")}
              </h2>
              <p className="section-subtitle">
                {safeT(
                  "nutrition.planDetails.subtitle",
                  "Ajusta metas y preferencias cuando lo necesites.",
                )}
              </p>
            </div>

            <button
              type="button"
              className="btn secondary fit-content"
              aria-expanded={isPlanDetailsOpen}
              aria-controls="nutrition-plan-details"
              onClick={onTogglePlanDetails}
            >
              {isPlanDetailsOpen
                ? safeT("ui.hide", "Ocultar")
                : safeT("ui.show", "Mostrar")}
              <Icon
                name="chevron-down"
                size={16}
                className="ml-6"
                style={{
                  transform: isPlanDetailsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 160ms ease",
                }}
              />
            </button>
          </div>

          <div
            id="nutrition-plan-details"
            role="region"
            aria-label={t("nutrition.planDetails.title")}
            hidden={!isPlanDetailsOpen}
            className="mt-16"
          >
            <div className="inline-actions-sm mb-12">
              <Link href="/app/nutricion/editar" className="btn secondary">
                {t("nutrition.editPlan")}
              </Link>
            </div>

            {aiTokenBalance !== null ? (
              <p className="muted mt-8 plan-token-line">
                {t("ai.tokensRemaining")} {aiTokenBalance}
                {aiTokenRenewalAt
                  ? ` · ${t("ai.tokensReset")} ${formatDate(aiTokenRenewalAt)}`
                  : ""}
              </p>
            ) : null}

            {exportMessage ? (
              <div
                className={`${getFeedbackClassName(exportMessageTone)} mt-8`}
                role="status"
                aria-live="polite"
              >
                <p className="muted m-0">{exportMessage}</p>
              </div>
            ) : null}

            <div className="export-actions mt-12">
              <button type="button" className="btn secondary" onClick={onExportCsv}>
                {t("nutrition.exportCsv")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={onCopyShoppingList}
              >
                {t("nutrition.exportCopyList")}
              </button>
            </div>

            <div className="badge-list plan-summary-chips mt-12">
              <Badge>
                {t("macros.goal")}:{" "}
                {t(
                  profile.goal === "cut"
                    ? "macros.goalCut"
                    : profile.goal === "bulk"
                      ? "macros.goalBulk"
                      : "macros.goalMaintain",
                )}
              </Badge>
              <Badge>
                {t("nutrition.mealsPerDay")}:{" "}
                {highlightedMealsCount ||
                  visiblePlan?.days?.[0]?.meals?.length ||
                  profile.nutritionPreferences.mealsPerDay}
              </Badge>
              <Badge>
                {t("nutrition.cookingTime")}:{" "}
                {t(
                  profile.nutritionPreferences.cookingTime === "quick"
                    ? "nutrition.cookingTimeOptionQuick"
                    : profile.nutritionPreferences.cookingTime === "long"
                      ? "nutrition.cookingTimeOptionLong"
                      : "nutrition.cookingTimeOptionMedium",
                )}
              </Badge>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">{t("macros.weight")}</div>
                <div className="info-value">{profile.weightKg ?? "-"} kg</div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("macros.height")}</div>
                <div className="info-value">{profile.heightCm ?? "-"} cm</div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("macros.activity")}</div>
                <div className="info-value">
                  {t(
                    profile.activity === "sedentary"
                      ? "macros.activitySedentary"
                      : profile.activity === "light"
                        ? "macros.activityLight"
                        : profile.activity === "moderate"
                          ? "macros.activityModerate"
                          : profile.activity === "very"
                            ? "macros.activityVery"
                            : "macros.activityExtra",
                  )}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("nutrition.dietTypeLabel")}</div>
                <div className="info-value">
                  {t(`nutrition.dietType.${profile.nutritionPreferences.dietType}`)}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">
                  {t("nutrition.mealDistributionLabel")}
                </div>
                <div className="info-value">
                  {t(
                    `nutrition.mealDistribution.${profile.nutritionPreferences.mealDistribution.preset}`,
                  )}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("nutrition.allergiesLabel")}</div>
                <div className="info-value">
                  {profile.nutritionPreferences.allergies.length > 0
                    ? profile.nutritionPreferences.allergies.join(", ")
                    : "-"}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("nutrition.dietaryPrefs")}</div>
                <div className="info-value">
                  {profile.nutritionPreferences.dietaryPrefs || "-"}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("nutrition.preferredFoods")}</div>
                <div className="info-value">
                  {profile.nutritionPreferences.preferredFoods || "-"}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("nutrition.dislikedFoods")}</div>
                <div className="info-value">
                  {profile.nutritionPreferences.dislikedFoods || "-"}
                </div>
              </div>
            </div>

            <p className="muted mt-12">{t("nutrition.preferencesHint")}</p>
          </div>
        </section>
      )}
    </>
  );
}

type NutritionDailyMetricsProps = {
  highlightedConsumedTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  highlightedTargetCalories: number | null;
  highlightedRemainingCalories: number | null;
  safeT: (key: string, fallback: string) => string;
  t: (key: string) => string;
};

export function NutritionDailyMetrics({
  highlightedConsumedTotals,
  highlightedTargetCalories,
  highlightedRemainingCalories,
  safeT,
  t,
}: NutritionDailyMetricsProps) {
  return (
    <div
      className="nutrition-hero-metrics"
      aria-label={safeT("nutrition.dailyTargetTitle", "Progreso del día")}
    >
      <article className="nutrition-hero-metric nutrition-hero-metric--primary">
        <span className="nutrition-hero-metric-label">Llevas hoy</span>
        <strong>
          {Math.round(highlightedConsumedTotals.calories)} {t("units.kcal")}
        </strong>
      </article>
      <article className="nutrition-hero-metric">
        <span className="nutrition-hero-metric-label">Objetivo</span>
        <strong>
          {highlightedTargetCalories !== null
            ? `${highlightedTargetCalories} ${t("units.kcal")}`
            : "-"}
        </strong>
      </article>
      <article className="nutrition-hero-metric">
        <span className="nutrition-hero-metric-label">Restantes</span>
        <strong>
          {highlightedRemainingCalories !== null
            ? `${highlightedRemainingCalories} ${t("units.kcal")}`
            : "-"}
        </strong>
      </article>
    </div>
  );
}

type NutritionShoppingListProps = {
  shoppingList: Array<{ name: string; grams: number }>;
  visiblePlan: NutritionPlanData | null;
  onGenerateShoppingList: (plan: NutritionPlanData) => void;
  t: (key: string) => string;
};

export function NutritionShoppingList({
  shoppingList,
  visiblePlan,
  onGenerateShoppingList,
  t,
}: NutritionShoppingListProps) {
  return (
    <div className="nutrition-v2-shopping nutrition-shopping-utility premium-surface-card card">
      <div className="inline-actions-space">
        <div>
          <h3 className="section-title section-title-sm m-0">
            {t("nutrition.shoppingTitle")}
          </h3>
          <p className="section-subtitle m-0">
            {shoppingList.length > 0
              ? `${shoppingList.length} items listos.`
              : "Genera una lista útil a partir de tu plan actual."}
          </p>
        </div>
        <button
          type="button"
          className="btn secondary fit-content"
          onClick={() => visiblePlan && onGenerateShoppingList(visiblePlan)}
        >
          {t("nutrition.shoppingGenerate")}
        </button>
      </div>
      {shoppingList.length > 0 ? (
        <Accordion
          items={[
            {
              id: "shopping-list",
              title: t("nutrition.shoppingTitle"),
              subtitle: `${shoppingList.length} items`,
              content: (
                <ul className="list-reset nutrition-shopping-list-v2">
                  {shoppingList.map((item) => (
                    <li key={item.name}>
                      <span>{item.name}</span>
                      <strong>{item.grams} g</strong>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
