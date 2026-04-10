"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/design-system/components/Input";
import { SegmentedControl } from "@/design-system/components/SegmentedControl";
import { Badge } from "@/design-system/components/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { ActivePlanSection, PlanCard, PlanHistoryList } from "@/components/plans/PlanSections";
import plansHubStyles from "@/components/plans/PlansHub.module.css";
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

type PlanOrigin = "trainer" | "ai" | "manual";

function readStoredSelectedPlanId(): string | null {
  if (typeof window === "undefined") return null;
  return normalizePlanSelection(window.localStorage.getItem(ACTIVE_NUTRITION_PLAN_STORAGE_KEY));
}

function resolvePlanOrigin(plan: NutritionPlanListItem, options: { assignedPlanId: string | null }): PlanOrigin {
  const planId = getNutritionPlanId(plan);
  if (options.assignedPlanId === planId) return "trainer";

  const candidate = plan as NutritionPlanListItem & Record<string, unknown>;
  const rawSource = [
    candidate.source,
    candidate.origin,
    candidate.planSource,
    candidate.createdWith,
    candidate.creationType,
    candidate.type,
  ].find((value) => typeof value === "string");

  if (typeof candidate.isAiGenerated === "boolean" && candidate.isAiGenerated) return "ai";

  if (typeof rawSource === "string") {
    const normalizedSource = rawSource.toLowerCase();
    if (normalizedSource.includes("trainer") || normalizedSource.includes("coach") || normalizedSource.includes("assigned")) return "trainer";
    if (normalizedSource.includes("ai") || normalizedSource.includes("ia")) return "ai";
    if (normalizedSource.includes("manual")) return "manual";
  }

  if (/\b(ai|ia)\b/i.test(plan.title)) return "ai";
  return "manual";
}

function getOriginBadge(origin: PlanOrigin): { label: string; variant: "info" | "warning" | "muted" } {
  switch (origin) {
    case "trainer":
      return { label: "Origen: entrenador", variant: "warning" };
    case "ai":
      return { label: "Origen: IA", variant: "info" };
    case "manual":
    default:
      return { label: "Origen: manual", variant: "muted" };
  }
}

export default function DietPlansClient() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [planSection, setPlanSection] = useState<"assigned" | "library" | "create">("assigned");
  const [plans, setPlans] = useState<NutritionPlanListItem[]>([]);
  const [state, setState] = useState<SectionState>("loading");
  const [assignedPlan, setAssignedPlan] = useState<NutritionPlanListItem | null>(null);
  const [assignedState, setAssignedState] = useState<SectionState>("loading");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return readStoredSelectedPlanId();
  });

  const queryPlanId = normalizePlanSelection(searchParams.get("planId"));
  const assignedPlanId = normalizePlanSelection(assignedPlan?.id);
  const activePlanId = resolveActiveNutritionPlanId(queryPlanId, selectedPlanId, assignedPlanId);

  const activePlan = !activePlanId
    ? null
    : assignedPlan && getNutritionPlanId(assignedPlan) === activePlanId
      ? assignedPlan
      : plans.find((plan) => getNutritionPlanId(plan) === activePlanId) ?? null;

  const mergedHistoryPlans = [...plans];
  if (assignedPlan) {
    const assignedId = getNutritionPlanId(assignedPlan);
    if (!mergedHistoryPlans.some((plan) => getNutritionPlanId(plan) === assignedId)) {
      mergedHistoryPlans.unshift(assignedPlan);
    }
  }
  const historyPlans = mergedHistoryPlans.filter((plan) => getNutritionPlanId(plan) !== activePlanId);
  const assignedPlanCardId = assignedPlan ? getNutritionPlanId(assignedPlan) : null;

  useEffect(() => {
    if (queryPlanId) {
      window.localStorage.setItem(ACTIVE_NUTRITION_PLAN_STORAGE_KEY, queryPlanId);
      queueMicrotask(() => setSelectedPlanId(queryPlanId));
      return;
    }

    const storedPlanId = readStoredSelectedPlanId();
    if (!storedPlanId) {
      queueMicrotask(() => setSelectedPlanId(null));
      return;
    }

    queueMicrotask(() => setSelectedPlanId(storedPlanId));
    const nextHref = buildNutritionPlanSearch(pathname, searchParamsString, storedPlanId);
    if (nextHref === `${pathname}?${searchParamsString}` || nextHref === pathname) return;
    router.replace(nextHref, { scroll: false });
  }, [pathname, queryPlanId, router, searchParamsString]);

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
      if (event.key === ACTIVE_NUTRITION_PLAN_STORAGE_KEY) {
        setSelectedPlanId(normalizePlanSelection(event.newValue) ?? readStoredSelectedPlanId());
        return;
      }

      if (event.key !== NUTRITION_PLANS_UPDATED_AT_KEY) return;
      setSelectedPlanId(readStoredSelectedPlanId());
      setReloadKey((value) => value + 1);
    };

    const handleFocus = () => {
      setSelectedPlanId(readStoredSelectedPlanId());
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

    setSelectedPlanId(normalized);
    window.localStorage.setItem(ACTIVE_NUTRITION_PLAN_STORAGE_KEY, normalized);
    router.replace(buildNutritionPlanSearch(pathname, searchParamsString, normalized), { scroll: false });
  };

  const renderPlanBadges = (plan: NutritionPlanListItem, isSelected: boolean) => {
    const planId = getNutritionPlanId(plan);
    const isAssignedByTrainer = assignedPlanId === planId;
    const origin = resolvePlanOrigin(plan, { assignedPlanId });
    const originBadge = getOriginBadge(origin);

    return (
      <>
        <Badge variant={isSelected ? "success" : "muted"}>{isSelected ? "Seleccionado" : "No seleccionado"}</Badge>
        {isAssignedByTrainer ? <Badge variant="warning">Asignado por entrenador</Badge> : null}
        <Badge variant={originBadge.variant}>{originBadge.label}</Badge>
      </>
    );
  };

  return (
    <>
      <section className={`card premium-surface-card ${plansHubStyles.plansHubShell}`}>
        <div className="stack-sm">
          <div>
            <p className="m-0 text-xs uppercase tracking-wider text-muted">Planes</p>
            <h1 className="section-title m-0">Biblioteca de nutrición</h1>
            <p className="section-subtitle m-0">Consulta planes asignados, revisa tu biblioteca y crea uno nuevo desde aquí.</p>
          </div>
          <SegmentedControl
            className={plansHubStyles.plansHubSegmented}
            ariaLabel="Secciones de planes de nutrición"
            value={planSection}
            onChange={(id) => setPlanSection(id as "assigned" | "library" | "create")}
            options={[
              { id: "assigned", label: "Asignados" },
              { id: "library", label: "Mis planes" },
              { id: "create", label: "Crear" },
            ]}
          />
        </div>
      </section>

      {planSection === "library" ? (
      <section className="card premium-surface-card">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("dietPlans.searchPlaceholder")}
          label={t("dietPlans.searchLabel")}
          helperText={t("dietPlans.searchHelper")}
        />
      </section>
      ) : null}

      {planSection === "assigned" ? (
      <ActivePlanSection title={t("plans.activeTitle")} emptyTitle={t("plans.activeEmpty")}>
        <p className="muted mt-6">Este es el plan seleccionado para tu calendario. El plan asignado por entrenador se mantiene como referencia.</p>
        {assignedState === "loading" ? <LoadingState showCard={false} ariaLabel={t("ui.loading")} className="mt-12" lines={2} /> : null}
        {assignedState === "error" ? <ErrorState className="mt-12" title={t("dietPlans.assignedLoadError")} retryLabel={t("ui.retry")} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
        {assignedState === "unavailable" ? <EmptyState className="mt-12" title={t("dietPlans.assignedUnavailable")} icon="warning" actions={[{ label: t("billing.manageBilling"), href: "/app/settings/billing", variant: "secondary" }]} /> : null}
        {assignedState === "ready" && activePlan ? (
          <PlanCard
            title={activePlan.title}
            metadata={t("dietPlans.planMeta", { date: formatPlanDate(activePlan), days: activePlan.daysCount })}
            statusLabel="Seleccionado"
            badges={renderPlanBadges(activePlan, true)}
            testId="nutrition-active-plan-card"
            actions={[
              { label: t("dietPlans.viewDetail"), href: `/app/biblioteca/planes-nutricion/${getNutritionPlanId(activePlan)}`, variant: "secondary", testId: "nutrition-view-active-plan" },
              { label: t("plans.activeBadge"), onClick: () => selectActivePlan(getNutritionPlanId(activePlan)), variant: "secondary", testId: "nutrition-go-calendar-cta" },
            ]}
          />
        ) : assignedState === "ready" ? (
          <EmptyState className="mt-12" title={t("plans.activeEmpty")} description={t("plans.historyEmptyDescription")} icon="info" />
        ) : null}

        {assignedPlan && assignedPlanId !== activePlanId ? (
          <div className="mt-12 stack-sm">
            <h3 className="m-0">Plan asignado por entrenador (referencia)</h3>
            <p className="muted m-0">Este plan no reemplaza tu seleccion actual salvo que lo elijas manualmente.</p>
            <PlanCard
              title={assignedPlan.title}
              metadata={t("dietPlans.planMeta", { date: formatPlanDate(assignedPlan), days: assignedPlan.daysCount })}
              badges={renderPlanBadges(assignedPlan, false)}
              testId="nutrition-assigned-plan-card"
              actions={[
                { label: t("dietPlans.viewDetail"), href: `/app/biblioteca/planes-nutricion/${getNutritionPlanId(assignedPlan)}`, variant: "secondary" },
                { label: t("dietPlans.selectActiveCta"), onClick: () => selectActivePlan(getNutritionPlanId(assignedPlan)), testId: `nutrition-select-active-${getNutritionPlanId(assignedPlan)}` },
              ]}
            />
          </div>
        ) : null}
      </ActivePlanSection>
      ) : null}

      {planSection === "library" ? (
      <PlanHistoryList title={t("plans.historyTitle")} emptyTitle={t("plans.historyEmpty")}>
        {activePlan ? (
          <div className="feature-card mt-12">
            <p className="m-0 text-xs uppercase tracking-wider text-muted">Seleccionado actualmente</p>
            <div className="mt-6">
              <PlanCard
                title={activePlan.title}
                metadata={t("dietPlans.planMeta", { date: formatPlanDate(activePlan), days: activePlan.daysCount })}
                statusLabel="Seleccionado"
                badges={renderPlanBadges(activePlan, true)}
                testId="nutrition-library-active-plan-card"
                actions={[
                  { label: t("plans.activeBadge"), onClick: () => selectActivePlan(getNutritionPlanId(activePlan)), variant: "secondary", testId: `nutrition-select-active-${getNutritionPlanId(activePlan)}` },
                  { label: t("dietPlans.viewDetail"), href: `/app/biblioteca/planes-nutricion/${getNutritionPlanId(activePlan)}`, variant: "secondary" },
                ]}
              />
            </div>
          </div>
        ) : null}

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
                  statusLabel={isSelected ? "Seleccionado" : undefined}
                  statusTestId={isSelected ? `nutrition-plan-active-badge-${planId}` : undefined}
                  badges={
                    <>
                      {renderPlanBadges(plan, isSelected)}
                      <span className="badge">{Math.round(plan.dailyCalories)} kcal</span>
                      <span className="badge">P {Math.round(plan.proteinG)}</span>
                      <span className="badge">C {Math.round(plan.carbsG)}</span>
                      <span className="badge">G {Math.round(plan.fatG)}</span>
                    </>
                  }
                  actions={[
                    { label: isSelected ? t("dietPlans.activeBadge") : t("dietPlans.selectActiveCta"), onClick: () => selectActivePlan(planId), variant: isSelected ? "secondary" : "primary", testId: `nutrition-select-active-${planId}` },
                    { label: t("dietPlans.viewDetail"), href: `/app/biblioteca/planes-nutricion/${planId}`, variant: "secondary", testId: `nutrition-view-plan-${planId}` },
                  ]}
                  testId={planId === assignedPlanCardId ? "nutrition-assigned-plan-card" : `nutrition-plan-card-${planId}`}
                />
              );
            })}
          </div>
        ) : null}
      </PlanHistoryList>
      ) : null}

      {planSection === "create" ? (
      <section className="card premium-surface-card">
        <div className="empty-state">
          <div>
            <h3 className="m-0">Crear un nuevo plan</h3>
            <p className="muted">Genera uno con IA o crea uno manual y después selecciónalo desde tu biblioteca.</p>
          </div>
          <div className="inline-actions-sm mt-12">
            <a className="btn" href="/app/nutricion?ai=1">{t("dietPlans.emptyCta")}</a>
            <a className="btn secondary" href="/app/nutricion/editar">{t("dietPlans.emptyManualCta")}</a>
          </div>
        </div>
      </section>
      ) : null}
    </>
  );
}
