"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { hasAiEntitlement, type AiEntitlementProfile } from "@/components/access/aiEntitlements";
import { getRoleFlags } from "@/lib/roles";
import { Input } from "@/design-system/components/Input";
import { SegmentedControl } from "@/design-system/components/SegmentedControl";
import { Badge } from "@/design-system/components/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ActivePlanSection, PlanCard, PlanHistoryList } from "@/components/plans/PlanSections";
import plansHubStyles from "@/components/plans/PlansHub.module.css";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanListItem } from "@/lib/types";

function getPlanId(plan: TrainingPlanListItem): string {
  const candidate = (plan as TrainingPlanListItem & { planId?: string }).planId;
  return (typeof candidate === "string" && candidate.trim().length > 0) ? candidate : plan.id;
}

function getPlanDate(plan: TrainingPlanListItem): string {
  return plan.createdAt || plan.startDate;
}

type TrainingPlanResponse = {
  items?: TrainingPlanListItem[];
};

type UserRoleResponse = Record<string, unknown>;

type ActiveTrainingPlanResponse = {
  source?: "assigned" | "own";
  plan?: TrainingPlanListItem;
};

type SectionState = "loading" | "ready" | "error" | "unavailable";
type AiGateState = "loading" | "eligible" | "locked" | "unavailable";
type PlanOrigin = "trainer" | "ai" | "manual";

const SELECTED_PLAN_STORAGE_KEY = "fs_selected_plan_id";
const LEGACY_ACTIVE_PLAN_STORAGE_KEY = "fs_active_training_plan_id";
const TRAINING_PLANS_UPDATED_AT_KEY = "fs_training_plans_updated_at";

function normalizePlanSelection(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readStoredSelectedPlanId(): string | null {
  if (typeof window === "undefined") return null;
  return (
    normalizePlanSelection(window.localStorage.getItem(SELECTED_PLAN_STORAGE_KEY))
    ?? normalizePlanSelection(window.localStorage.getItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY))
  );
}

function persistSelectedPlanId(planId: string) {
  window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, planId);
  window.localStorage.setItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY, planId);
}

function resolvePlanOrigin(plan: TrainingPlanListItem, options: {
  assignedPlanId: string | null;
  gymPlanIds: Set<string>;
}): PlanOrigin {
  const planId = getPlanId(plan);
  if (options.gymPlanIds.has(planId)) return "trainer";

  const candidate = plan as TrainingPlanListItem & Record<string, unknown>;
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
    if (normalizedSource.includes("ai") || normalizedSource.includes("ia")) return "ai";
    if (normalizedSource.includes("trainer") || normalizedSource.includes("coach") || normalizedSource.includes("assigned")) return "trainer";
    if (normalizedSource.includes("manual")) return "manual";
  }

  if (/\b(ai|ia)\b/i.test(plan.title)) return "ai";
  return "manual";
}

function getOriginBadge(origin: PlanOrigin, t: (key: string, values?: Record<string, string | number | boolean | null | undefined>) => string): { label: string; variant: "info" | "warning" | "muted" } {
  switch (origin) {
    case "trainer":
      return { label: t("library.training.originTrainer"), variant: "warning" };
    case "ai":
      return { label: t("library.training.originAi"), variant: "info" };
    case "manual":
    default:
      return { label: t("library.training.originManual"), variant: "muted" };
  }
}

export default function TrainingLibraryClient() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [planSection, setPlanSection] = useState<"assigned" | "library" | "create">("assigned");
  const [fitSculptPlans, setFitSculptPlans] = useState<TrainingPlanListItem[]>([]);
  const [fitSculptState, setFitSculptState] = useState<SectionState>("loading");
  const [gymPlans, setGymPlans] = useState<TrainingPlanListItem[]>([]);
  const [gymState, setGymState] = useState<SectionState>("loading");
  const [assignedPlan, setAssignedPlan] = useState<TrainingPlanListItem | null>(null);
  const [assignedPlanState, setAssignedPlanState] = useState<SectionState>("loading");
  const [aiGateState, setAiGateState] = useState<AiGateState>("loading");
  const [canLoadGymPlans, setCanLoadGymPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return readStoredSelectedPlanId();
  });

  const queryPlanId = normalizePlanSelection(searchParams.get("planId"));

  useEffect(() => {
    if (queryPlanId) {
      persistSelectedPlanId(queryPlanId);
      queueMicrotask(() => setSelectedPlanId(queryPlanId));
      return;
    }

    const storedPlanId = readStoredSelectedPlanId();
    if (!storedPlanId) {
      queueMicrotask(() => setSelectedPlanId(null));
      return;
    }

    queueMicrotask(() => setSelectedPlanId(storedPlanId));
    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("planId", storedPlanId);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [pathname, queryPlanId, router, searchParamsString]);

  useEffect(() => {
    const controller = new AbortController();

    const loadRole = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          setAiGateState("unavailable");
          setCanLoadGymPlans(false);
          return;
        }
        const data = (await response.json()) as UserRoleResponse & AiEntitlementProfile;
        const roles = getRoleFlags(data);
        setCanLoadGymPlans(roles.isAdmin || roles.isTrainer);
        setAiGateState(hasAiEntitlement(data) ? "eligible" : "locked");
      } catch {
        setAiGateState("unavailable");
      }
    };

    void loadRole();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadAssignedPlan = async () => {
      setAssignedPlanState("loading");

      try {
        const response = await fetch("/api/training-plans/active", { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          setAssignedPlan(null);
          setAssignedPlanState((response.status === 401 || response.status === 403 || response.status === 404 || response.status === 405 || response.status === 501) ? "unavailable" : "error");
          return;
        }

        const data = (await response.json()) as ActiveTrainingPlanResponse;
        if (data.source === "assigned" && data.plan) {
          setAssignedPlan(data.plan);
          setAssignedPlanState("ready");
          return;
        }

        setAssignedPlan(null);
        setAssignedPlanState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAssignedPlan(null);
        setAssignedPlanState("unavailable");
      }
    };

    const loadPlans = async () => {
      setFitSculptState("loading");

      const params = new URLSearchParams();
      params.set("limit", "100");
      if (query.trim()) params.set("query", query.trim());

      try {
        const fitSculptResponse = await fetch(`/api/training-plans?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!fitSculptResponse.ok) {
          setFitSculptPlans([]);
          setFitSculptState("unavailable");
        } else {
          const data = (await fitSculptResponse.json()) as TrainingPlanResponse;
          setFitSculptPlans(data.items ?? []);
          setFitSculptState("ready");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFitSculptPlans([]);
        setFitSculptState("error");
      }

      if (!canLoadGymPlans) {
        setGymPlans([]);
        setGymState("unavailable");
      } else {
        try {
          const gymResponse = await fetch(`/api/trainer/plans?${params.toString()}`, {
            cache: "no-store",
            signal: controller.signal,
          });

          if (!gymResponse.ok) {
            setGymPlans([]);
            setGymState((gymResponse.status === 401 || gymResponse.status === 403 || gymResponse.status === 404 || gymResponse.status === 405) ? "unavailable" : "error");
            return;
          }

          const data = (await gymResponse.json()) as TrainingPlanResponse;
          setGymPlans(data.items ?? []);
          setGymState("ready");
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setGymPlans([]);
          setGymState("unavailable");
        }
      }
    };

    void Promise.all([loadPlans(), loadAssignedPlan()]);
    return () => controller.abort();
  }, [canLoadGymPlans, query, reloadKey]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SELECTED_PLAN_STORAGE_KEY || event.key === LEGACY_ACTIVE_PLAN_STORAGE_KEY) {
        setSelectedPlanId(normalizePlanSelection(event.newValue) ?? readStoredSelectedPlanId());
        return;
      }

      if (event.key !== TRAINING_PLANS_UPDATED_AT_KEY) return;
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


  const formatter = useMemo(() => new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale === "pt" ? "pt-PT" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }), [locale]);

  const formatPlanDate = (plan: TrainingPlanListItem): string => {
    const dateValue = getPlanDate(plan);
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? t("library.training.planDateFallback") : formatter.format(parsed);
  };
  const allPlans = useMemo(() => {
    const map = new Map<string, TrainingPlanListItem>();
    fitSculptPlans.forEach((plan) => map.set(getPlanId(plan), plan));
    gymPlans.forEach((plan) => map.set(getPlanId(plan), plan));
    if (assignedPlan) map.set(getPlanId(assignedPlan), assignedPlan);
    return Array.from(map.values());
  }, [assignedPlan, fitSculptPlans, gymPlans]);

  const gymPlanIds = useMemo(() => {
    const ids = new Set<string>();
    gymPlans.forEach((plan) => ids.add(getPlanId(plan)));
    return ids;
  }, [gymPlans]);

  const assignedPlanId = assignedPlan ? getPlanId(assignedPlan) : null;

  const resolvedActivePlanId = selectedPlanId ?? assignedPlanId;
  const activePlan = useMemo(() => {
    if (!resolvedActivePlanId) return null;
    return allPlans.find((plan) => getPlanId(plan) === resolvedActivePlanId) ?? null;
  }, [allPlans, resolvedActivePlanId]);

  const historyPlans = useMemo(
    () => allPlans.filter((plan) => getPlanId(plan) !== resolvedActivePlanId),
    [allPlans, resolvedActivePlanId]
  );

  const selectPlan = (planId: string) => {
    const normalizedPlanId = planId.trim();
    if (!normalizedPlanId) return;

    setSelectedPlanId(normalizedPlanId);
    persistSelectedPlanId(normalizedPlanId);

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("planId", normalizedPlanId);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  const renderPlanBadges = (plan: TrainingPlanListItem, isSelected: boolean) => {
    const planId = getPlanId(plan);
    const isAssignedByTrainer = assignedPlanId === planId;
    const origin = resolvePlanOrigin(plan, {
      assignedPlanId,
      gymPlanIds,
    });
    const originBadge = getOriginBadge(origin, t);

    return (
      <>
        <Badge variant={isSelected ? "success" : "muted"}>{isSelected ? t("library.training.statusSelected") : t("library.training.statusNotSelected")}</Badge>
        {isAssignedByTrainer ? <Badge variant="warning">{t("library.training.assignedByTrainer")}</Badge> : null}
        <Badge variant={originBadge.variant}>{originBadge.label}</Badge>
      </>
    );
  };

  return (
    <>
      <section className={`card premium-surface-card ${plansHubStyles.plansHubShell}`}>
        <div className="stack-sm">
          <div>
            <p className="m-0 text-xs uppercase tracking-wider text-muted">{t("library.training.hubEyebrow")}</p>
            <h1 className="section-title m-0">{t("library.training.hubTitle")}</h1>
            <p className="section-subtitle m-0">{t("library.training.hubSubtitle")}</p>
          </div>
          <SegmentedControl
            className={plansHubStyles.plansHubSegmented}
            ariaLabel={t("library.training.sectionAriaLabel")}
            value={planSection}
            onChange={(id) => setPlanSection(id as "assigned" | "library" | "create")}
            options={[
              { id: "assigned", label: t("library.training.tabs.assigned") },
              { id: "library", label: t("library.training.tabs.library") },
              { id: "create", label: t("library.training.tabs.create") },
            ]}
          />
        </div>
      </section>

      {planSection === "library" ? (
      <section className="card premium-surface-card">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("trainingPlans.searchPlaceholder")}
          label={t("trainingPlans.searchLabel")}
          helperText={t("trainingPlans.searchHelper")}
        />
      </section>
      ) : null}

      {planSection === "assigned" ? (
      <ActivePlanSection title={t("plans.activeTitle")} emptyTitle={t("plans.activeEmpty")}>
        <p className="muted mt-6">{t("library.training.activeDescription")}</p>
        {(fitSculptState === "loading" || assignedPlanState === "loading" || (canLoadGymPlans && gymState === "loading")) ? <LoadingState showCard={false} ariaLabel={t("ui.loading")} className="mt-12" lines={2} /> : null}
        {(fitSculptState === "error" || assignedPlanState === "error" || gymState === "error") ? <ErrorState className="mt-12" title={t("library.training.sectionError")} retryLabel={t("ui.retry")} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
        {activePlan ? (
            <PlanCard
              title={activePlan.title}
              metadata={t("library.training.planMeta", { days: activePlan.daysCount, level: activePlan.level, date: formatPlanDate(activePlan) })}
              statusLabel={t("library.training.statusSelected")}
              badges={renderPlanBadges(activePlan, true)}
              testId="training-active-plan-card"
              actions={[
                { label: t("trainingPlans.viewDetail"), href: `/app/biblioteca/planes-entrenamiento/${getPlanId(activePlan)}`, variant: "secondary" },
              { label: t("library.training.selected"), onClick: () => selectPlan(getPlanId(activePlan)), variant: "secondary", testId: `training-select-plan-${getPlanId(activePlan)}` },
            ]}
          />
        ) : assignedPlanState === "ready" ? (
          <EmptyState className="mt-12" title={t("plans.activeEmpty")} description={t("plans.historyEmptyDescription")} icon="info" />
        ) : null}

        {assignedPlan && assignedPlanId !== resolvedActivePlanId ? (
          <div className="mt-12 stack-sm">
            <h3 className="m-0">{t("library.training.assignedReferenceTitle")}</h3>
            <p className="muted m-0">{t("library.training.assignedReferenceDescription")}</p>
            <PlanCard
              title={assignedPlan.title}
              metadata={t("library.training.planMeta", { days: assignedPlan.daysCount, level: assignedPlan.level, date: formatPlanDate(assignedPlan) })}
              badges={renderPlanBadges(assignedPlan, false)}
              testId="training-assigned-plan-card"
              actions={[
                { label: t("trainingPlans.viewDetail"), href: `/app/biblioteca/planes-entrenamiento/${getPlanId(assignedPlan)}`, variant: "secondary" },
                { label: t("library.training.choose"), onClick: () => selectPlan(getPlanId(assignedPlan)), testId: `training-select-plan-${getPlanId(assignedPlan)}` },
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
            <p className="m-0 text-xs uppercase tracking-wider text-muted">{t("library.training.currentlySelectedLabel")}</p>
            <div className="mt-6">
              <PlanCard
                title={activePlan.title}
                metadata={t("library.training.planMeta", { days: activePlan.daysCount, level: activePlan.level, date: formatPlanDate(activePlan) })}
                statusLabel={t("library.training.statusSelected")}
                badges={renderPlanBadges(activePlan, true)}
                testId="training-library-active-plan-card"
                actions={[
                  { label: t("library.training.selected"), onClick: () => selectPlan(getPlanId(activePlan)), variant: "secondary", testId: `training-select-plan-${getPlanId(activePlan)}` },
                  { label: t("trainingPlans.viewDetail"), href: `/app/biblioteca/planes-entrenamiento/${getPlanId(activePlan)}`, variant: "secondary" },
                ]}
              />
            </div>
          </div>
        ) : null}

        {(fitSculptState === "loading" || (canLoadGymPlans && gymState === "loading")) ? <LoadingState showCard={false} ariaLabel={t("ui.loading")} className="mt-12" lines={2} /> : null}
        {(fitSculptState === "error" || gymState === "error") ? <ErrorState className="mt-12" title={t("library.training.sectionError")} retryLabel={t("ui.retry")} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
        {fitSculptState === "unavailable" && gymState === "unavailable" ? <EmptyState className="mt-12" title={t("library.training.sectionUnavailable")} icon="warning" actions={[{ label: t("billing.manageBilling"), href: "/app/settings/billing", variant: "secondary" }]} /> : null}
        {fitSculptState === "ready" && (!canLoadGymPlans || gymState === "ready" || gymState === "unavailable") && historyPlans.length === 0 ? (
          <EmptyState className="mt-12" title={t("plans.historyEmpty")} description={t("plans.historyEmptyDescription")} icon="info" />
        ) : null}

        {historyPlans.length > 0 ? (
          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {historyPlans.map((plan) => {
              const planId = getPlanId(plan);
              return (
                <PlanCard
                  key={planId}
                  title={plan.title}
                  metadata={t("library.training.planMeta", { days: plan.daysCount, level: plan.level, date: formatPlanDate(plan) })}
                  badges={renderPlanBadges(plan, false)}
                  actions={[
                    { label: t("library.training.choose"), onClick: () => selectPlan(planId), variant: "primary", testId: `training-select-plan-${planId}` },
                    { label: t("trainingPlans.viewDetail"), href: `/app/biblioteca/planes-entrenamiento/${planId}`, variant: "secondary", testId: `training-view-plan-${planId}` },
                  ]}
                  testId={`training-plan-card-${planId}`}
                />
              );
            })}
          </div>
        ) : null}
      </PlanHistoryList>
      ) : null}

      {planSection === "create" ? (
      <section className="card premium-surface-card">
        <h2 className="section-title section-title-sm">{t("library.training.createTitle")}</h2>
        {aiGateState === "loading" ? (
          <LoadingState showCard={false} ariaLabel={t("ui.loading")} className="mt-12" lines={2} />
        ) : null}
        {aiGateState === "unavailable" ? (
          <div className="feature-card mt-12" role="status">
            <strong>{t("library.training.aiUnavailableTitle")}</strong>
            <p className="muted mt-6">{t("library.training.aiUnavailableDescription")}</p>
          </div>
        ) : null}
        {aiGateState === "locked" ? (
          <div className="feature-card mt-12" role="status">
            <strong>{t("library.training.aiLockedTitle")}</strong>
            <p className="muted mt-6">{t("library.training.aiLockedDescription")}</p>
            <div className="mt-12">
              <Link href="/app/settings/billing" className="btn secondary">{t("billing.manageBilling")}</Link>
            </div>
          </div>
        ) : null}
        {aiGateState === "eligible" ? (
          <div className="feature-card mt-12">
            <strong>{t("library.training.aiPlaceholderTitle")}</strong>
            <p className="muted mt-6">{t("library.training.aiPlaceholderDescription")}</p>
            <div className="inline-actions-sm mt-12">
              <Link href="/app/entrenamiento?ai=1" className="btn">{t("trainingPlans.aiCta")}</Link>
              <Link href="/app/entrenamiento/editar" className="btn secondary">{t("training.manualCreate")}</Link>
            </div>
          </div>
        ) : (
          <div className="feature-card mt-12">
            <strong>{t("training.manualCreate")}</strong>
            <p className="muted mt-6">{t("library.training.manualOnlyDescription")}</p>
            <div className="mt-12">
              <Link href="/app/entrenamiento/editar" className="btn secondary">{t("training.manualCreate")}</Link>
            </div>
          </div>
        )}
      </section>
      ) : null}

    </>
  );
}
