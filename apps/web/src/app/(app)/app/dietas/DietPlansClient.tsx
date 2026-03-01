"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import type { NutritionPlanListItem } from "@/lib/types";

function getPlanId(plan: NutritionPlanListItem): string {
  const candidate = (plan as NutritionPlanListItem & { planId?: string }).planId;
  return (typeof candidate === "string" && candidate.trim().length > 0) ? candidate : plan.id;
}

function getPlanDate(plan: NutritionPlanListItem): string {
  return plan.createdAt || plan.startDate;
}

function formatPlanDate(plan: NutritionPlanListItem, formatter: Intl.DateTimeFormat, fallback: string): string {
  const parsed = new Date(getPlanDate(plan));
  return Number.isNaN(parsed.getTime()) ? fallback : formatter.format(parsed);
}

type NutritionPlanResponse = {
  items?: NutritionPlanListItem[];
};

type SectionState = "loading" | "ready" | "error" | "unavailable";
const NUTRITION_PLANS_UPDATED_AT_KEY = "fs_nutrition_plans_updated_at";

export default function DietPlansClient() {
  const { t, locale } = useLanguage();
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [plans, setPlans] = useState<NutritionPlanListItem[]>([]);
  const [state, setState] = useState<SectionState>("loading");

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
          setState((response.status === 401 || response.status === 403 || response.status === 404 || response.status === 405 || response.status === 501) ? "unavailable" : "error");
          return;
        }

        const data = (await response.json()) as NutritionPlanResponse;
        setPlans(data.items ?? []);
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
            {plans.map((plan) => (
              <article key={getPlanId(plan)} className="feature-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <h3 className="m-0">{plan.title}</h3>
                    <p className="muted mt-6">
                      {t("dietPlans.planMeta", {
                        date: formatPlanDate(plan, formatter, t("dietPlans.planDateFallback")),
                        days: plan.daysCount,
                      })}
                    </p>
                  </div>
                </div>

                <div className="badge-list mt-12">
                  <span className="badge">{Math.round(plan.dailyCalories)} kcal</span>
                  <span className="badge">P {Math.round(plan.proteinG)}</span>
                  <span className="badge">C {Math.round(plan.carbsG)}</span>
                  <span className="badge">G {Math.round(plan.fatG)}</span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Link href={`/app/dietas/${getPlanId(plan)}`} className="btn secondary">
                    {t("dietPlans.viewDetail")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
