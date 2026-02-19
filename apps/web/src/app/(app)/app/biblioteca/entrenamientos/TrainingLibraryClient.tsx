"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanListItem } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";

type TrainingPlanResponse = {
  items: TrainingPlanListItem[];
};

type ActiveTrainingPlanResponse = {
  plan?: TrainingPlanListItem | null;
};

type UserRoleResponse = {
  role?: "ADMIN" | "USER";
};

export default function TrainingLibraryClient() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadRole = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as UserRoleResponse;
        setIsAdmin(data.role === "ADMIN");
      } catch (_err) {
      }
    };
    void loadRole();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadActivePlan = async () => {
      try {
        const response = await fetch("/api/training-plans/active?includeDays=0", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 404 || response.status === 405) {
          setActivePlanId(null);
          return;
        }

        if (!response.ok) {
          setActivePlanId(null);
          return;
        }

        const payload = (await response.json()) as ActiveTrainingPlanResponse;
        const id = payload.plan?.id;
        setActivePlanId(typeof id === "string" && id.trim() ? id : null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setActivePlanId(null);
      }
    };

    void loadActivePlan();
    return () => controller.abort();
  }, [retryKey]);

  useEffect(() => {
    const controller = new AbortController();
    const loadPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        params.set("limit", "100");
        const response = await fetch(`/api/training-plans?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(t("trainingPlans.loadErrorList"));
          setPlans([]);
          setLoading(false);
          return;
        }
        const data = (await response.json()) as TrainingPlanResponse;
        setPlans(data.items ?? []);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(t("trainingPlans.loadErrorList"));
        setPlans([]);
        setLoading(false);
      }
    };

    void loadPlans();
    return () => controller.abort();
  }, [query, retryKey, t]);

  const goalLabel = (goal: string) =>
    goal === "cut" ? t("training.goalCut") : goal === "bulk" ? t("training.goalBulk") : t("training.goalMaintain");
  const levelLabel = (level: string) =>
    level === "beginner"
      ? t("training.levelBeginner")
      : level === "advanced"
        ? t("training.levelAdvanced")
        : t("training.levelIntermediate");
  const focusLabel = (focus: string) =>
    focus === "ppl"
      ? t("training.focusPushPullLegs")
      : focus === "upperLower"
        ? t("training.focusUpperLower")
        : t("training.focusFullBody");

  const plansById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

  const activatePlan = async (planId: string) => {
    if (activatingPlanId) return;

    const plan = plansById.get(planId);
    if (!plan) {
      setActivationError(t("trainingPlans.activateError"));
      return;
    }

    setActivatingPlanId(planId);
    setActivationError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ trainingPlan: plan }),
      });

      if (!response.ok) {
        setActivationError(t("trainingPlans.activateError"));
        setActivatingPlanId(null);
        return;
      }

      setActivePlanId(planId);
      setActivatingPlanId(null);
    } catch (_err) {
      setActivationError(t("trainingPlans.activateError"));
      setActivatingPlanId(null);
    }
  };

  return (
    <section className="card">
      <div className="library-search">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("trainingPlans.searchPlaceholder")}
          label={t("trainingPlans.searchLabel")}
          helperText={t("trainingPlans.searchHelper")}
        />
        <div className="library-filter-actions">
          <Badge variant="muted">{t("trainingPlans.filtersActive")}</Badge>
          {query.trim().length > 0 ? <Badge>{t("trainingPlans.filterQueryLabel")} {query.trim()}</Badge> : null}
        </div>
      </div>

      {loading ? (
        <div className="list-grid mt-16">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : error ? (
        <div className="empty-state mt-16">
          <div className="empty-state-icon">
            <Icon name="warning" />
          </div>
          <div>
            <h3 className="m-0">{t("trainingPlans.errorTitle")}</h3>
            <p className="muted">{error}</p>
          </div>
          <Button variant="secondary" onClick={() => setRetryKey((prev) => prev + 1)}>
            {t("ui.retry")}
          </Button>
        </div>
      ) : plans.length === 0 ? (
        <div className="empty-state mt-16">
          <div className="empty-state-icon">
            <Icon name="info" />
          </div>
          <div>
            <h3 className="m-0">{t("trainingPlans.emptyTitle")}</h3>
            <p className="muted">{t("trainingPlans.empty")}</p>
          </div>
          <div className="empty-state-actions">
            {isAdmin ? (
              <Link className="btn secondary" href="/app/entrenamiento">
                {t("trainingPlans.emptyAdminCta")}
              </Link>
            ) : null}
            <Button onClick={() => setRetryKey((prev) => prev + 1)}>
              {t("trainingPlans.retrySearch")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="list-grid mt-16">
          {plans.map((plan) => {
            const isActive = activePlanId === plan.id;
            const isActivating = activatingPlanId === plan.id;

            return (
              <article key={plan.id} className="feature-card library-card">
                <h3>{plan.title}</h3>
                {plan.notes ? <p className="muted">{plan.notes}</p> : null}
                <div className="badge-list">
                  <span className="badge">{goalLabel(plan.goal)}</span>
                  <span className="badge">{levelLabel(plan.level)}</span>
                  <span className="badge">
                    {t("training.daysPerWeek")}: {plan.daysPerWeek}
                  </span>
                  <span className="badge">{focusLabel(plan.focus)}</span>
                  {isActive ? <Badge variant="success">{t("trainingPlans.activeBadge")}</Badge> : null}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <Link href={`/app/biblioteca/entrenamientos/${plan.id}`} className="btn secondary">
                    {t("trainingPlans.viewDetail")}
                  </Link>
                  <Button
                    onClick={() => void activatePlan(plan.id)}
                    disabled={isActive || Boolean(activatingPlanId)}
                    aria-label={isActive ? t("trainingPlans.activeBadge") : t("trainingPlans.activateCta")}
                  >
                    {isActivating
                      ? t("trainingPlans.activating")
                      : isActive
                        ? t("trainingPlans.activeCta")
                        : t("trainingPlans.activateCta")}
                  </Button>
                </div>
              </article>
            );
          })}
          {activationError ? <p className="muted" style={{ marginTop: 8 }}>{activationError}</p> : null}
        </div>
      )}
    </section>
  );
}
