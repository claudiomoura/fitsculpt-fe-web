"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";

type NutritionPlanItem = { id: string; title: string; description?: string | null };

function normalizePlansPayload(data: unknown): NutritionPlanItem[] {
  if (!data || typeof data !== "object") return [];
  const payload = data as { items?: unknown; nutritionPlans?: unknown; plans?: unknown; data?: unknown };
  const list = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.nutritionPlans)
      ? payload.nutritionPlans
      : Array.isArray(payload.plans)
        ? payload.plans
        : Array.isArray(payload.data)
          ? payload.data
          : [];

  return list.filter((item): item is NutritionPlanItem => Boolean(item) && typeof item === "object" && "id" in item && "title" in item);
}

export default function TrainerNutritionPlansPageClient() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<NutritionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/nutrition-plans?limit=100", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("LOAD_ERROR");
      const data = (await res.json()) as unknown;
      setPlans(normalizePlansPayload(data));
    } catch {
      setError(t("trainer.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPlans(); }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/nutrition-plans", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error("CREATE_ERROR");
      setTitle("");
      setDescription("");
      await loadPlans();
    } catch {
      setError(t("trainer.error"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="section-stack" data-testid="trainer-nutrition-plans-page">
      <h1 className="section-title">Planes de nutrición</h1>
      <form className="card form-stack" onSubmit={onSubmit}>
        <h2 style={{ margin: 0 }}>Crear plan de nutrición</h2>
        <label className="form-stack" style={{ gap: 6 }}>
          <span>Título</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="form-stack" style={{ gap: 6 }}>
          <span>Descripción (opcional)</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
        </label>
        <button type="submit" className="btn" data-testid="create-nutrition-plan-button" disabled={creating || !title.trim()}>
          {creating ? t("ui.loading") : "Crear plan de nutrición"}
        </button>
      </form>

      <section className="card form-stack" data-testid="nutrition-plan-list">
        <h2 style={{ margin: 0 }}>Planes del gimnasio</h2>
        {loading ? <p className="muted">{t("common.loading")}</p> : null}
        {error ? <p className="muted">{error}</p> : null}
        {!loading && !error && plans.length === 0 ? <p className="muted">No hay planes de nutrición todavía.</p> : null}
        {!loading && !error && plans.length > 0 ? (
          <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
            {plans.map((plan) => (
              <li key={plan.id}>
                <strong>{plan.title}</strong>
                {plan.description ? <p className="muted" style={{ margin: "4px 0 0" }}>{plan.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  );
}
