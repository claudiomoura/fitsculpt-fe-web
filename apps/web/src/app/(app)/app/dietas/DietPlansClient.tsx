"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import type { NutritionPlanListItem } from "@/lib/types";
import {
  ACTIVE_NUTRITION_PLAN_STORAGE_KEY,
  NUTRITION_PLANS_UPDATED_AT_KEY,
  getNutritionPlanDate,
  getNutritionPlanId,
  getNutritionPlansFromResponse,
  isUnavailableNutritionStatus,
  resolveActiveNutritionPlanId,
  buildNutritionPlanSearch,
  normalizePlanSelection,
  type NutritionPlanResponse,
} from "@/lib/nutritionPlanLibrary";

type SectionState = "loading" | "ready" | "error" | "unavailable";

export default function DietPlansClient() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [plans, setPlans] = useState<NutritionPlanListItem[]>([]);
  const [state, setState] = useState<SectionState>("loading");
  const [storedActivePlanId] = useState(() => {
    if (typeof window === "undefined") return null;
    return normalizePlanSelection(window.localStorage.getItem(ACTIVE_NUTRITION_PLAN_STORAGE_KEY));
  });

  const queryPlanId = normalizePlanSelection(searchParams.get("planId"));
  const activePlanId = resolveActiveNutritionPlanId(queryPlanId, storedActivePlanId);

  useEffect(() => {
    if (queryPlanId) {
      window.localStorage.setItem(ACTIVE_NUTRITION_PLAN_STORAGE_KEY, queryPlanId);
      return;
    }

    if (!storedActivePlanId) return;
    router.replace(buildNutritionPlanSearch(pathname, searchParams.toString(), storedActivePlanId));
  }, [pathname, queryPlanId, router, searchParams, storedActivePlanId]);

  useEffect(() => {
    const controller = new AbortController();
    const loadPlans = async () => {
      setState("loading");

      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        params.set("limit", "100");

        const response = await fetch(`/api/nutrition-plans?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setPlans([]);
          setState(isUnavailableNutritionStatus(response.status) ? "unavailable" : "error");
          return;
        }

        const data = (await response.json()) as NutritionPlanResponse;
        setPlans(getNutritionPlansFromResponse(data));
        setState("ready");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPlans([]);
        setState("error");
      }
    };

    void loadPlans();
    return () => controller.abort();
  }, [query, reloadKey]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== NUTRITION_PLANS_UPDATED_AT_KEY) return;
      setReloadKey((value) => value + 1);
    };

    const handleFocus = () => {
      setReloadKey((value) => value + 1);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const formatter = useMemo(() => new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }), [locale]);

  const formatPlanDate = (plan: NutritionPlanListItem): string => {
    const parsed = new Date(getNutritionPlanDate(plan));
    return Number.isNaN(parsed.getTime()) ? t("dietPlans.planDateFallback") : formatter.format(parsed);
  };

  const selectActivePlan = (planId: string) => {
    const normalized = normalizePlanSelection(planId);
    if (!normalized) return;

    window.localStorage.setItem(ACTIVE_NUTRITION_PLAN_STORAGE_KEY, normalized);
    router.replace(buildNutritionPlanSearch(pathname, searchParams.toString(), normalized));
  };

  return (
    <>
      <section className="card">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("dietPlans.searchPlaceholder")}
          label={t("dietPlans.searchLabel")}
          helperText={t("dietPlans.searchHelper")}
        />
      </section>

      {activePlanId ? (
        <section className="card" data-testid="nutrition-active-plan-calendar-card">
          <h2 className="section-title section-title-sm">{t("dietPlans.activePlanCalendarTitle")}</h2>
          <p className="muted mt-6">{t("dietPlans.activePlanCalendarDescription")}</p>
          <div className="mt-12">
            <Link href={`/app/nutricion?planId=${encodeURIComponent(activePlanId)}`} className="btn" data-testid="nutrition-go-calendar-cta">
              {t("dietPlans.goToCalendar")}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2 className="section-title section-title-sm">{t("dietPlans.sectionTitle")}</h2>

        {state === "loading" ? (
          <LoadingState showCard={false} ariaLabel={t("ui.loading")} className="mt-12" lines={2} />
        ) : null}

        {state === "error" ? (
          <ErrorState
            className="mt-12"
            title={t("dietPlans.loadErrorList")}
            retryLabel={t("ui.retry")}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        ) : null}
        {state === "unavailable" ? <EmptyState className="mt-12" title={t("dietPlans.unavailable")} icon="warning" actions={[{ label: t("billing.manageBilling"), href: "/app/settings/billing", variant: "secondary" }]} /> : null}

        {state === "ready" && plans.length === 0 ? (
          <EmptyState
            className="mt-12"
            title={t("dietPlans.empty")}
            description={t("dietPlans.emptyDescription")}
            actions={[{ label: t("dietPlans.emptyCta"), href: "/app/nutricion", variant: "secondary" }]}
          />
        ) : null}

        {state === "ready" && plans.length > 0 ? (
          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {plans.map((plan) => {
              const planId = getNutritionPlanId(plan);
              const isSelected = activePlanId === planId;
              return (
                <article key={planId} className="feature-card" data-testid={`nutrition-plan-card-${planId}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <h3 className="m-0">{plan.title}</h3>
                      <p className="muted mt-6">
                        {t("dietPlans.planMeta", {
                          date: formatPlanDate(plan),
                          days: plan.daysCount,
                        })}
                      </p>
                    </div>
                    {isSelected ? <span className="badge badge-success" data-testid={`nutrition-plan-active-badge-${planId}`}>{t("dietPlans.activeBadge")}</span> : null}
                  </div>

                  <div className="badge-list mt-12">
                    <span className="badge">{Math.round(plan.dailyCalories)} kcal</span>
                    <span className="badge">P {Math.round(plan.proteinG)}</span>
                    <span className="badge">C {Math.round(plan.carbsG)}</span>
                    <span className="badge">G {Math.round(plan.fatG)}</span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <Button
                      variant={isSelected ? "secondary" : "primary"}
                      onClick={() => selectActivePlan(planId)}
                      data-testid={`nutrition-select-active-${planId}`}
                    >
                      {isSelected ? t("dietPlans.activeBadge") : t("dietPlans.selectActiveCta")}
                    </Button>
                    <Link href={`/app/dietas/${planId}`} className="btn secondary" data-testid={`nutrition-view-plan-${planId}`}>
                      {t("dietPlans.viewDetail")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </>
  );
}
