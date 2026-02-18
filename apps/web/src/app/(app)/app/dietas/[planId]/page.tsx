import Link from "next/link";
import { cookies, headers } from "next/headers";
import type { NutritionPlanDetail } from "@/lib/types";
import { getServerT } from "@/lib/serverI18n";

async function getAppUrl() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }
  return `${protocol}://${host}`;
}

async function fetchPlan(planId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${await getAppUrl()}/api/nutrition-plans/${planId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { plan: null, error: "LOAD_ERROR" };
    }
    const data = (await response.json()) as NutritionPlanDetail;
    return { plan: data, error: null };
  } catch (_err) {
    return { plan: null, error: "LOAD_ERROR" };
  }
}

export default async function DietPlanDetailPage(props: { params: Promise<{ planId: string }> }) {
  const { t, localeCode } = await getServerT();
  const { planId } = await props.params;
  if (!planId) {
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">{t("dietPlanDetail.loadError")}</p>
          <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/dietas">
            {t("dietPlanDetail.backToPlans")}
          </Link>
        </section>
      </div>
    );
  }

  const { plan, error } = await fetchPlan(planId);
  if (error || !plan) {
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">{t("dietPlanDetail.loadError")}</p>
          <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/dietas">
            {t("dietPlanDetail.backToPlans")}
          </Link>
        </section>
      </div>
    );
  }

  const startDate = plan.startDate ? new Date(plan.startDate) : null;
  const planFormatter = new Intl.DateTimeFormat(localeCode, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const dayFormatter = new Intl.DateTimeFormat(localeCode, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const mealTypeLabels: Record<string, string> = {
    breakfast: t("nutrition.mealTypeBreakfast"),
    lunch: t("nutrition.mealTypeLunch"),
    dinner: t("nutrition.mealTypeDinner"),
    snack: t("nutrition.mealTypeSnack"),
  };

  return (
    <div className="page">
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="form-stack">
          <Link className="muted" href="/app/dietas">
            {t("dietPlanDetail.backToPlans")}
          </Link>
          <h1 className="section-title">{plan.title}</h1>
          <p className="section-subtitle">{t("dietPlanDetail.subtitle")}</p>
        </div>
        <div className="badge-list" style={{ marginTop: 12 }}>
          <span className="badge">{Math.round(plan.dailyCalories)} kcal</span>
          <span className="badge">P {Math.round(plan.proteinG)}</span>
          <span className="badge">C {Math.round(plan.carbsG)}</span>
          <span className="badge">G {Math.round(plan.fatG)}</span>
          <span className="badge">
            {t("dietPlanDetail.daysLabel")}: {plan.daysCount}
          </span>
          <span className="badge">
            {t("dietPlanDetail.startLabel")}: {startDate ? planFormatter.format(startDate) : t("dietPlanDetail.startFallback")}
          </span>
        </div>
      </section>

      <section className="card" style={{ maxWidth: 960, margin: "16px auto 0" }}>
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("dietPlanDetail.daysTitle")}</h2>
            <p className="section-subtitle">{t("dietPlanDetail.daysSubtitle")}</p>
          </div>
        </div>
        {plan.days.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            {t("dietPlanDetail.emptyDays")}
          </p>
        ) : (
          <div className="form-stack" style={{ marginTop: 16 }}>
            {plan.days.map((day) => (
              <div key={day.id} className="feature-card">
                <div className="form-stack">
                  <div className="badge-list">
                    <span className="badge">{t("dietPlanDetail.dayLabel")} {day.order + 1}</span>
                    <span className="badge">
                      {day.date ? dayFormatter.format(new Date(day.date)) : t("dietPlanDetail.dayDateFallback")}
                    </span>
                  </div>
                  <h3 style={{ margin: 0 }}>{day.dayLabel || t("dietPlanDetail.dayLabelFallback")}</h3>
                </div>
                <div className="form-stack" style={{ marginTop: 12 }}>
                  {day.meals.length === 0 ? (
                    <p className="muted">{t("dietPlanDetail.emptyMeals")}</p>
                  ) : (
                    day.meals.map((meal) => {
                      const mealTypeKey = meal.type?.toLowerCase() ?? "";
                      const mealType =
                        mealTypeLabels[mealTypeKey] ||
                        meal.type ||
                        t("dietPlanDetail.mealTypeFallback");
                      return (
                        <div key={meal.id} className="card" style={{ padding: 12 }}>
                          <div className="form-stack">
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <div>
                                <strong>{meal.title || t("dietPlanDetail.mealTitleFallback")}</strong>
                                <p className="muted" style={{ margin: "4px 0 0" }}>{mealType}</p>
                              </div>
                              <div className="badge-list">
                                <span className="badge">{Math.round(meal.calories)} kcal</span>
                                <span className="badge">P {Math.round(meal.protein)}</span>
                                <span className="badge">C {Math.round(meal.carbs)}</span>
                                <span className="badge">G {Math.round(meal.fats)}</span>
                              </div>
                            </div>
                            {meal.description ? <p className="muted">{meal.description}</p> : null}
                            <div>
                              <div style={{ fontWeight: 600 }}>{t("dietPlanDetail.ingredientsTitle")}</div>
                              {meal.ingredients.length === 0 ? (
                                <p className="muted">{t("dietPlanDetail.ingredientsEmpty")}</p>
                              ) : (
                                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                                  {meal.ingredients.map((ingredient) => (
                                    <li key={ingredient.id}>
                                      {ingredient.name}: {ingredient.grams} {t("nutrition.grams")}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
