"use client";

import { useEffect, useState } from "react";

type NutritionPlan = { id: string; title: string };

function normalizePlanListPayload(payload: unknown): NutritionPlan[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { items?: unknown; nutritionPlans?: unknown; plans?: unknown; data?: unknown };
  const list = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.nutritionPlans)
      ? data.nutritionPlans
      : Array.isArray(data.plans)
        ? data.plans
        : Array.isArray(data.data)
          ? data.data
          : [];

  return list.filter(
    (item): item is NutritionPlan =>
      Boolean(item)
      && typeof item === "object"
      && "id" in item
      && typeof (item as { id?: unknown }).id === "string"
      && "title" in item
      && typeof (item as { title?: unknown }).title === "string"
  );
}

export default function TrainerMemberNutritionPlanAssignmentCard({ memberId }: { memberId: string }) {
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [assigned, setAssigned] = useState<NutritionPlan | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [plansRes, assignedRes] = await Promise.all([
        fetch("/api/trainer/nutrition-plans?limit=100", { credentials: "include", cache: "no-store" }),
        fetch(`/api/trainer/clients/${memberId}/assigned-nutrition-plan`, { credentials: "include", cache: "no-store" }),
      ]);
      const plansData = plansRes.ok ? (await plansRes.json()) as unknown : null;
      const assignedData = assignedRes.ok ? (await assignedRes.json()) as { assignedPlan?: NutritionPlan | null; plan?: NutritionPlan | null } : {};
      setPlans(normalizePlanListPayload(plansData));
      setAssigned(assignedData.assignedPlan ?? assignedData.plan ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [memberId]);

  const assign = async () => {
    if (!selected) return;
    await fetch(`/api/trainer/members/${memberId}/nutrition-plan-assignment`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nutritionPlanId: selected }),
    });
    setSelected("");
    await load();
  };

  return (
    <section className="card form-stack" aria-live="polite">
      <h4 style={{ margin: 0 }}>Plan de nutrición</h4>
      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && assigned ? <p className="muted">Asignado: <strong>{assigned.title}</strong> (Asignado)</p> : null}
      {!loading && !assigned ? <p className="muted">Sin plan asignado</p> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Selecciona un plan</option>
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
        </select>
        <button type="button" className="btn" data-testid="assign-nutrition-plan-button" disabled={!selected} onClick={() => void assign()}>
          Asignar plan de nutrición
        </button>
      </div>
    </section>
  );
}
