"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanListItem } from "@/lib/types";

type TrainingPlanResponse = {
  items: TrainingPlanListItem[];
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
  }, [query, t]);

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

  return (
    <section className="card">
      <div className="form-stack">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("trainingPlans.searchPlaceholder")}
        />
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {t("trainingPlans.loading")}
        </p>
      ) : error ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : plans.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <p className="muted">{t("trainingPlans.empty")}</p>
          {isAdmin ? (
            <Link className="btn secondary" href="/app/entrenamiento" style={{ marginTop: 12 }}>
              {t("trainingPlans.emptyAdminCta")}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="list-grid" style={{ marginTop: 16 }}>
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/app/biblioteca/entrenamientos/${plan.id}`}
              className="feature-card"
              style={{ textDecoration: "none" }}
            >
              <h3>{plan.title}</h3>
              {plan.notes ? <p className="muted">{plan.notes}</p> : null}
              <div className="badge-list">
                <span className="badge">{goalLabel(plan.goal)}</span>
                <span className="badge">{levelLabel(plan.level)}</span>
                <span className="badge">
                  {t("training.daysPerWeek")}: {plan.daysPerWeek}
                </span>
                <span className="badge">{focusLabel(plan.focus)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
