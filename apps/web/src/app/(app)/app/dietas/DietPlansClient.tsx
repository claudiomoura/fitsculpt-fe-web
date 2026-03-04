"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { ActivePlanSection, PlanCard, PlanHistoryList } from "@/components/plans/PlanSections";
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

type AssignedPlanResponse = {
  assignedPlan?: NutritionPlanListItem | null;
};

export default function DietPlansClient() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [plans, setPlans] = useState<NutritionPlanListItem[]>([]);
  const [state, setState] = useState<SectionState>("loading");
  const [assignedPlan, setAssignedPlan] = useState<NutritionPlanListItem | null>(null);
  const [assignedState, setAssignedState] = useState<SectionState>("loading");
  const [storedActivePlanId] = useState(() => {
    if (typeof window === "undefined") return null;
    return normalizePlanSelection(window.localStorage.getItem(ACTIVE_NUTRITION_PLAN_STORAGE_KEY));
  });

  const queryPlanId = normalizePlanSelection(searchParams.get("planId"));
  const assignedPlanId = normalizePlanSelection(assignedPlan?.id);
  const activePlanId = resolveActiveNutritionPlanId(queryPlanId, storedActivePlanId, assignedPlanId);

  const activePlan = useMemo(() => {
    if (!activePlanId) return null;
    if (assignedPlan && getNutritionPlanId(assignedPlan) === activePlanId) return assignedPlan;
    return plans.find((plan) => getNutritionPlanId(plan) === activePlanId) ?? null;
  }, [activePlanId, assignedPlan, plans]);

  const historyPlans = useMemo(() => {
    const mergedPlans = [...plans];
    if (assignedPlan) {
      const assignedId = getNutritionPlanId(assignedPlan);
      if (!mergedPlans.some((plan) => getNutritionPlanId(plan) === assignedId)) {
        mergedPlans.unshift(assignedPlan);
      }
    }

    return mergedPlans.filter((plan) => getNutritionPlanId(plan) !== activePlanId);
  }, [activePlanId, assignedPlan, plans]);

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
    const controller = new AbortController();

    const loadAssignedPlan = async () => {
      setAssignedState("loading");

      try {
        const response = await fetch("/api/nutrition-plans/assigned", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setAssignedPlan(null);
          setAssignedState(isUnavailableNutritionStatus(response.status) ? "unavailable" : "error");
          return;
        }

        const data = (await response.json()) as AssignedPlanResponse;
        setAssignedPlan(data.assignedPlan ?? null);
        setAssignedState("ready");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAssignedPlan(null);
        setAssignedState("error");
      }
    };

    void loadAssignedPlan();

    return () => controller.abort();
  }, [reloadKey]);

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

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [locale]
  );

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

      <ActivePlanSection title={t("plans.activeTitle")} emptyTitle={t("plans.activeEmpty")}>
        {assignedState === "loading" ? <LoadingState showCard={false} ariaLabel={t("ui.loading")} className="mt-12" lines={2} /> : null}
        {assignedState === "error" ? <ErrorState className="mt-12" title={t("dietPlans.assignedLoadError")} retryLabel={t("ui.retry")} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
        {assignedState === "unavailable" ? <EmptyState className="mt-12" title={t("dietPlans.assignedUnavailable")} icon="warning" actions={[{ label: t("billing.manageBilling"), href: "/app/settings/billing", variant: "secondary" }]} /> : null}
        {assignedState === "ready" && activePlan ? (
          <PlanCard
            title={activePlan.title}
            metadata={t("dietPlans.planMeta", { date: formatPlanDate(activePlan), days: activePlan.daysCount })}
            statusLabel={t("plans.activeBadge")}
            testId="nutrition-active-plan-card"
            actions={[
              { label: t("dietPlans.viewDetail"), href: `/app/dietas/${getNutritionPlanId(activePlan)}`, variant: "secondary", testId: "nutrition-view-active-plan" },
              { label: t("dietPlans.goToCalendar"), href: `/app/nutricion?planId=${encodeURIComponent(getNutritionPlanId(activePlan))}`, testId: "nutrition-go-calendar-cta" },
            ]}
          />
        ) : null}
      </ActivePlanSection>

      <PlanHistoryList title={t("plans.historyTitle")} emptyTitle={t("plans.historyEmpty")}>
        {state === "loading" ? <LoadingState showCard={false} ariaLabel={t("ui.loading")} className="mt-12" lines={2} /> : null}
        {state === "error" ? (
          <div data-testid="nutrition-plans-error-state">
            <ErrorState className="mt-12" title={t("dietPlans.loadErrorList")} retryLabel={t("ui.retry")} onRetry={() => setReloadKey((value) => value + 1)} />
          </div>
        ) : null}
        {state === "unavailable" ? <EmptyState className="mt-12" title={t("dietPlans.unavailable")} icon="warning" actions={[{ label: t("billing.manageBilling"), href: "/app/settings/billing", variant: "secondary" }]} /> : null}

        {state === "ready" && historyPlans.length === 0 ? (
          <EmptyState
            className="mt-12"
            title={t("plans.historyEmpty")}
            description={t("plans.historyEmptyDescription")}
            actions={[
              { label: t("dietPlans.emptyCta"), href: "/app/nutricion?ai=1", variant: "primary" },
              { label: t("dietPlans.emptyManualCta"), href: "/app/nutricion/editar", variant: "secondary" },
            ]}
          />
        ) : null}

        {state === "ready" && historyPlans.length > 0 ? (
          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {historyPlans.map((plan) => {
              const planId = getNutritionPlanId(plan);
              const isSelected = activePlanId === planId;
              return (
                <PlanCard
                  key={planId}
                  title={plan.title}
                  metadata={t("dietPlans.planMeta", { date: formatPlanDate(plan), days: plan.daysCount })}
                  badges={
                    <>
                      <span className="badge">{Math.round(plan.dailyCalories)} kcal</span>
                      <span className="badge">P {Math.round(plan.proteinG)}</span>
                      <span className="badge">C {Math.round(plan.carbsG)}</span>
                      <span className="badge">G {Math.round(plan.fatG)}</span>
                    </>
                  }
                  actions={[
                    { label: isSelected ? t("dietPlans.activeBadge") : t("dietPlans.selectActiveCta"), onClick: () => selectActivePlan(planId), variant: isSelected ? "secondary" : "primary", testId: `nutrition-select-active-${planId}` },
                    { label: t("dietPlans.viewDetail"), href: `/app/dietas/${planId}`, variant: "secondary", testId: `nutrition-view-plan-${planId}` },
                  ]}
                  testId={`nutrition-plan-card-${planId}`}
                />
              );
            })}
          </div>
        ) : null}
      </PlanHistoryList>
    </>
  );
}
