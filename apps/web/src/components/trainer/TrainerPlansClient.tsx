"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import TrainerAdminNoGymPanel from "./TrainerAdminNoGymPanel";
import { useTrainerAreaAccess } from "./useTrainerAreaAccess";

type Plan = {
  id: string;
  title: string;
  description?: string | null;
};

type ListState = "loading" | "ready";

function parsePlans(payload: unknown): Plan[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const rows = Array.isArray(source.items) ? source.items : Array.isArray(source.data) ? source.data : Array.isArray(payload) ? payload : [];

  return rows
    .map((item) => {
      const row = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      const id = typeof row.id === "string" ? row.id : null;
      const title = typeof row.title === "string" ? row.title : null;
      if (!id || !title) return null;
      return {
        id,
        title,
        description: typeof row.description === "string" ? row.description : null,
      };
    })
    .filter((item): item is Plan => Boolean(item));
}

export default function TrainerPlansClient() {
  const { t } = useLanguage();
  const { isLoading: accessLoading, gymLoading, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  const [state, setState] = useState<ListState>("loading");
  const [error, setError] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);

  const loadPlans = useCallback(async () => {
    setState("loading");
    setError(false);

    try {
      const response = await fetch("/api/training-plans", { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        setError(true);
        setState("ready");
        return;
      }

      setPlans(parsePlans((await response.json()) as unknown));
      setState("ready");
    } catch {
      setError(true);
      setState("ready");
    }
  }, []);

  useEffect(() => {
    if (!canAccessTrainerArea) return;
    void loadPlans();
  }, [canAccessTrainerArea, loadPlans]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || creating) return;

    setCreating(true);
    setCreateError(false);

    try {
      const response = await fetch("/api/training-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });

      if (!response.ok) {
        setCreateError(true);
        setCreating(false);
        return;
      }

      setTitle("");
      setDescription("");
      setCreating(false);
      await loadPlans();
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  };

  if (accessLoading || gymLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (canAccessAdminNoGymPanel) {
    return <TrainerAdminNoGymPanel />;
  }

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") {
      return <EmptyState title={t("trainer.gymRequiredTitle")} description={t("trainer.gymRequiredDesc")} wrapInCard icon="info" />;
    }

    if (membership.state === "unknown") {
      return <EmptyState title={t("trainer.gymUnknownTitle")} description={t("trainer.gymUnknownDesc")} wrapInCard icon="info" />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <section className="card form-stack">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.createTitle")}</h2>
        <form className="form-stack" onSubmit={onCreate}>
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.plans.titleLabel")}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.plans.descriptionLabel")}</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
          <button className="btn fit-content" type="submit" disabled={creating || !title.trim()}>
            {creating ? t("trainer.plans.creating") : t("trainer.plans.create")}
          </button>
          {createError ? <p className="muted">{t("trainer.plans.createError")}</p> : null}
        </form>
      </section>

      <section className="card form-stack">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.listTitle")}</h2>
        {state === "loading" ? <LoadingState ariaLabel={t("trainer.plans.loading")} lines={3} /> : null}
        {state === "ready" && error ? (
          <ErrorState title={t("trainer.plans.error")} retryLabel={t("ui.retry")} onRetry={() => void loadPlans()} wrapInCard />
        ) : null}
        {state === "ready" && !error && plans.length === 0 ? <EmptyState title={t("trainer.plans.empty")} wrapInCard icon="info" /> : null}
        {state === "ready" && !error && plans.length > 0 ? (
          <ul className="form-stack" aria-label={t("trainer.plans.listTitle")}>
            {plans.map((plan) => (
              <li key={plan.id} className="feature-card">
                <strong>{plan.title}</strong>
                {plan.description ? <p className="muted" style={{ margin: "4px 0 0" }}>{plan.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
