"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageProvider";
import type { NutritionPlanListItem } from "@/lib/types";

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
          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {Array.from({ length: 2 }).map((_, index) => <SkeletonCard key={index} />)}
          </div>
        ) : null}

        {state === "error" ? (
          <div className="feature-card mt-12" role="alert">
            <strong>{t("dietPlans.loadErrorList")}</strong>
            <div className="mt-12">
              <button type="button" className="btn secondary" onClick={() => setReloadKey((value) => value + 1)}>
                {t("ui.retry")}
              </button>
            </div>
          </div>
        ) : null}
        {state === "unavailable" ? <p className="muted mt-12">{t("dietPlans.unavailable")}</p> : null}

        {state === "ready" && plans.length === 0 ? (
          <div className="feature-card mt-12" role="status">
            <strong>{t("dietPlans.empty")}</strong>
            <p className="muted mt-6">{t("dietPlans.emptyDescription")}</p>
            <div className="mt-12">
              <Link href="/app/nutricion" className="btn secondary">
                {t("dietPlans.emptyCta")}
              </Link>
            </div>
          </div>
        ) : null}

        {state === "ready" && plans.length > 0 ? (
          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {plans.map((plan) => (
              <article key={plan.id} className="feature-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <h3 className="m-0">{plan.title}</h3>
                    <p className="muted mt-6">
                      {t("dietPlans.planMeta", {
                        date: formatter.format(new Date(plan.startDate)),
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
                  <Link href={`/app/dietas/${plan.id}`} className="btn secondary">
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
