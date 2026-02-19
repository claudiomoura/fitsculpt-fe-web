"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanListItem } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

type TrainingPlanResponse = {
  items: TrainingPlanListItem[];
};

type ActiveTrainingPlanResponse = {
  plan?: TrainingPlanListItem | null;
};

type UserRoleResponse = {
  role?: "ADMIN" | "USER";
};

type PlanCapabilities = {
  activate: boolean;
  deactivate: boolean;
  delete: boolean;
  singleActive: boolean;
};

const initialCapabilities: PlanCapabilities = {
  activate: false,
  deactivate: false,
  delete: false,
  singleActive: false,
};

function parseAllowHeader(value: string | null): string[] {
  return (value ?? "").split(",").map((entry) => entry.trim().toUpperCase()).filter(Boolean);
}

export default function TrainingLibraryClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<PlanCapabilities>(initialCapabilities);
  const [activateTarget, setActivateTarget] = useState<TrainingPlanListItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TrainingPlanListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingPlanListItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadRole = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as UserRoleResponse;
        setIsAdmin(data.role === "ADMIN");
      } catch {
      }
    };
    void loadRole();
    return () => controller.abort();
  }, []);

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

  useEffect(() => {
    const controller = new AbortController();

    const loadCapabilitiesAndActive = async () => {
      let canActivate = false;
      let canDeactivate = false;
      let singleActive = false;

      try {
        const activeOptions = await fetch("/api/training-plans/active", {
          method: "OPTIONS",
          cache: "no-store",
          signal: controller.signal,
        });
        const allowed = parseAllowHeader(activeOptions.headers.get("allow"));
        canActivate = allowed.includes("POST");
        canDeactivate = allowed.includes("DELETE");
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          canActivate = false;
          canDeactivate = false;
        }
      }

      try {
        const activeResponse = await fetch("/api/training-plans/active?includeDays=0", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (activeResponse.ok) {
          const payload = (await activeResponse.json()) as ActiveTrainingPlanResponse;
          const id = payload.plan?.id;
          setActivePlanId(typeof id === "string" && id.trim() ? id : null);
          singleActive = true;
        } else {
          setActivePlanId(null);
          singleActive = false;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setActivePlanId(null);
        singleActive = false;
      }

      let canDelete = false;
      const sampleId = plans[0]?.id;
      if (sampleId) {
        try {
          const detailOptions = await fetch(`/api/training-plans/${sampleId}`, {
            method: "OPTIONS",
            cache: "no-store",
            signal: controller.signal,
          });
          const allowed = parseAllowHeader(detailOptions.headers.get("allow"));
          canDelete = allowed.includes("DELETE");
        } catch (err) {
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            canDelete = false;
          }
        }
      }

      setCapabilities({
        activate: canActivate,
        deactivate: canDeactivate,
        delete: canDelete,
        singleActive,
      });
    };

    void loadCapabilitiesAndActive();
    return () => controller.abort();
  }, [plans, retryKey]);

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


  const activatePlan = async (planId: string) => {
    if (!capabilities.activate || processingPlanId) return;
    setProcessingPlanId(planId);
    setActionError(null);

    try {
      const response = await fetch("/api/training-plans/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        setActionError(t("trainingPlans.activateError"));
        setProcessingPlanId(null);
        return;
      }

      setActivePlanId(planId);
      setProcessingPlanId(null);
      setActivateTarget(null);
      setRetryKey((prev) => prev + 1);
      notify({ title: t("trainingPlans.activateSuccess"), variant: "success" });
    } catch {
      setActionError(t("trainingPlans.activateError"));
      setProcessingPlanId(null);
    }
  };

  const deactivatePlan = async () => {
    if (!deactivateTarget || !capabilities.deactivate || processingPlanId) return;
    setProcessingPlanId(deactivateTarget.id);
    setActionError(null);

    try {
      const response = await fetch("/api/training-plans/active", {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        setActionError(t("trainingPlans.deactivateError"));
        setProcessingPlanId(null);
        return;
      }

      setActivePlanId(null);
      setProcessingPlanId(null);
      setDeactivateTarget(null);
      setRetryKey((prev) => prev + 1);
      notify({ title: t("trainingPlans.deactivateSuccess"), variant: "success" });
    } catch {
      setActionError(t("trainingPlans.deactivateError"));
      setProcessingPlanId(null);
    }
  };

  const deletePlan = async () => {
    if (!deleteTarget || !capabilities.delete || processingPlanId) return;
    setProcessingPlanId(deleteTarget.id);
    setActionError(null);

    try {
      const response = await fetch(`/api/training-plans/${deleteTarget.id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        setActionError(t("trainingPlans.deleteError"));
        setProcessingPlanId(null);
        return;
      }

      setPlans((prev) => prev.filter((plan) => plan.id !== deleteTarget.id));
      if (activePlanId === deleteTarget.id) {
        setActivePlanId(null);
      }
      setProcessingPlanId(null);
      setDeleteTarget(null);
      setRetryKey((prev) => prev + 1);
      notify({ title: t("trainingPlans.deleteSuccess"), variant: "success" });
    } catch {
      setActionError(t("trainingPlans.deleteError"));
      setProcessingPlanId(null);
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

      {!capabilities.singleActive ? <p className="muted mt-8">{t("trainingPlans.singleActiveNotAvailable")}</p> : null}

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
            const isProcessing = processingPlanId === plan.id;

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
                    onClick={() => setActivateTarget(plan)}
                    disabled={isActive || Boolean(processingPlanId) || !capabilities.activate}
                    aria-label={isActive ? t("trainingPlans.activeBadge") : t("trainingPlans.activateCta")}
                  >
                    {isProcessing ? t("trainingPlans.activating") : t("trainingPlans.activateCta")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setDeactivateTarget(plan)}
                    disabled={!isActive || Boolean(processingPlanId) || !capabilities.deactivate}
                  >
                    {t("trainingPlans.deactivateCta")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteTarget(plan)}
                    disabled={Boolean(processingPlanId) || !capabilities.delete}
                  >
                    {t("trainingPlans.deleteCta")}
                  </Button>
                </div>
              </article>
            );
          })}
          {actionError ? <p className="muted" style={{ marginTop: 8 }}>{actionError}</p> : null}
          {(!capabilities.activate || !capabilities.deactivate || !capabilities.delete) ? (
            <p className="muted" style={{ marginTop: 8 }}>{t("trainingPlans.actionsNotAvailable")}</p>
          ) : null}
        </div>
      )}

      <Modal
        open={Boolean(activateTarget)}
        onClose={() => setActivateTarget(null)}
        title={t("trainingPlans.activateConfirmTitle")}
        description={t("trainingPlans.activateConfirmDescription")}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setActivateTarget(null)}>{t("ui.cancel")}</Button>
          <Button onClick={() => void activatePlan(activateTarget?.id ?? "")}>
            {t("trainingPlans.activateCta")}
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title={t("trainingPlans.deactivateConfirmTitle")}
        description={t("trainingPlans.deactivateConfirmDescription")}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeactivateTarget(null)}>{t("ui.cancel")}</Button>
          <Button variant="danger" onClick={() => void deactivatePlan()}>{t("trainingPlans.deactivateCta")}</Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("trainingPlans.deleteConfirmTitle")}
        description={t("trainingPlans.deleteConfirmDescription")}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t("ui.cancel")}</Button>
          <Button variant="danger" onClick={() => void deletePlan()}>{t("trainingPlans.deleteCta")}</Button>
        </div>
      </Modal>
    </section>
  );
}
