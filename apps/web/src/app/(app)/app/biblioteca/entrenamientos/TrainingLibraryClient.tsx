"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { hasAiEntitlement, type AiEntitlementProfile } from "@/components/access/aiEntitlements";
import { getRoleFlags } from "@/lib/roles";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ActivePlanSection, PlanCard, PlanHistoryList } from "@/components/plans/PlanSections";
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

const SELECTED_PLAN_STORAGE_KEY = "fs_selected_plan_id";
const LEGACY_ACTIVE_PLAN_STORAGE_KEY = "fs_active_training_plan_id";
const TRAINING_PLANS_UPDATED_AT_KEY = "fs_training_plans_updated_at";

export default function TrainingLibraryClient() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [fitSculptPlans, setFitSculptPlans] = useState<TrainingPlanListItem[]>([]);
  const [fitSculptState, setFitSculptState] = useState<SectionState>("loading");
  const [gymPlans, setGymPlans] = useState<TrainingPlanListItem[]>([]);
  const [gymState, setGymState] = useState<SectionState>("loading");
  const [assignedPlan, setAssignedPlan] = useState<TrainingPlanListItem | null>(null);
  const [assignedPlanState, setAssignedPlanState] = useState<SectionState>("loading");
  const [aiGateState, setAiGateState] = useState<AiGateState>("loading");
  const [canLoadGymPlans, setCanLoadGymPlans] = useState(false);
  const [storedPlanId] = useState(() => {
    if (typeof window === "undefined") return "";

    return (
      window.localStorage.getItem(SELECTED_PLAN_STORAGE_KEY)?.trim()
      || window.localStorage.getItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY)?.trim()
      || ""
    );
  });

  const queryPlanId = searchParams.get("planId")?.trim() ?? "";
  const activePlanId = queryPlanId || storedPlanId || null;

  useEffect(() => {
    if (queryPlanId) {
      window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, queryPlanId);
      window.localStorage.setItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY, queryPlanId);
      return;
    }

    if (!storedPlanId) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("planId", storedPlanId);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [pathname, queryPlanId, router, searchParams, storedPlanId]);

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
      if (event.key !== TRAINING_PLANS_UPDATED_AT_KEY) return;
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

  const resolvedActivePlanId = activePlanId ?? (assignedPlan ? getPlanId(assignedPlan) : null);
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

    window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, normalizedPlanId);
    window.localStorage.setItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY, normalizedPlanId);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("planId", normalizedPlanId);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <>
      <section className="card">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("trainingPlans.searchPlaceholder")}
          label={t("trainingPlans.searchLabel")}
          helperText={t("trainingPlans.searchHelper")}
        />
      </section>

      <ActivePlanSection title={t("plans.activeTitle")} emptyTitle={t("plans.activeEmpty")}>
        {(fitSculptState === "loading" || assignedPlanState === "loading" || (canLoadGymPlans && gymState === "loading")) ? <LoadingState showCard={false} ariaLabel={t("ui.loading")} className="mt-12" lines={2} /> : null}
        {(fitSculptState === "error" || assignedPlanState === "error" || gymState === "error") ? <ErrorState className="mt-12" title={t("library.training.sectionError")} retryLabel={t("ui.retry")} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
        {activePlan ? (
          <PlanCard
            title={activePlan.title}
            metadata={t("library.training.planMeta", { days: activePlan.daysCount, level: activePlan.level, date: formatPlanDate(activePlan) })}
            statusLabel={t("plans.activeBadge")}
            actions={[
              { label: t("trainingPlans.viewDetail"), href: `/app/biblioteca/entrenamientos/${getPlanId(activePlan)}`, variant: "secondary" },
              { label: t("library.training.choose"), onClick: () => selectPlan(getPlanId(activePlan)), variant: "secondary" },
              // Requiere implementación: deep link directo a semana específica cuando el backend exponga ese contexto.
              { label: t("library.training.goToWeek"), href: `/app/entrenamiento?planId=${encodeURIComponent(getPlanId(activePlan))}` },
            ]}
          />
        ) : null}
      </ActivePlanSection>

      <PlanHistoryList title={t("plans.historyTitle")} emptyTitle={t("plans.historyEmpty")}>
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
              const isSelected = resolvedActivePlanId === planId;
              return (
                <PlanCard
                  key={planId}
                  title={plan.title}
                  metadata={t("library.training.planMeta", { days: plan.daysCount, level: plan.level, date: formatPlanDate(plan) })}
                  actions={[
                    { label: isSelected ? t("library.training.selected") : t("library.training.choose"), onClick: () => selectPlan(planId), variant: isSelected ? "secondary" : "primary" },
                    { label: t("trainingPlans.viewDetail"), href: `/app/biblioteca/entrenamientos/${planId}`, variant: "secondary" },
                  ]}
                />
              );
            })}
          </div>
        ) : null}
      </PlanHistoryList>

      <section className="card">
        <h2 className="section-title section-title-sm">{t("library.training.sections.ai")}</h2>
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
            <div className="mt-12">
              <Link href="/app/entrenamiento?ai=1" className="btn">{t("trainingPlans.aiCta")}</Link>
            </div>
          </div>
        ) : null}
      </section>

    </>
  );
}
