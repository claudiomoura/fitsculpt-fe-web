"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { NutritionPlanListItem } from "@/lib/types";

type NutritionPlanResponse = {
  items: NutritionPlanListItem[];
};

export default function DietPlansClient() {
  const { t, locale } = useLanguage();
  const [query, setQuery] = useState("");
  const [plans, setPlans] = useState<NutritionPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        params.set("limit", "100");
        const response = await fetch(`/api/nutrition-plans?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(t("dietPlans.loadErrorList"));
          setPlans([]);
          setLoading(false);
          return;
        }
        const data = (await response.json()) as NutritionPlanResponse;
        setPlans(data.items ?? []);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(t("dietPlans.loadErrorList"));
        setPlans([]);
        setLoading(false);
      }
    };

    void loadPlans();
    return () => controller.abort();
  }, [query, t]);

  const formatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="card">
      <div className="form-stack">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("dietPlans.searchPlaceholder")}
        />
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {t("dietPlans.loading")}
        </p>
      ) : error ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : plans.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <p className="muted">{t("dietPlans.empty")}</p>
          <Link className="btn secondary" href="/app/nutricion" style={{ marginTop: 12 }}>
            {t("dietPlans.emptyCta")}
          </Link>
        </div>
      ) : (
        <div className="list-grid" style={{ marginTop: 16 }}>
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/app/dietas/${plan.id}`}
              className="feature-card"
              style={{ textDecoration: "none" }}
            >
              <h3>{plan.title}</h3>
              <p className="muted">
                {formatter.format(new Date(plan.startDate))} · {plan.daysCount} {t("dietPlans.daysLabel")}
              </p>
              <div className="badge-list">
                <span className="badge">{Math.round(plan.dailyCalories)} kcal</span>
                <span className="badge">P {Math.round(plan.proteinG)}</span>
                <span className="badge">C {Math.round(plan.carbsG)}</span>
                <span className="badge">G {Math.round(plan.fatG)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
