"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { extractTrainerClients, type TrainerClient } from "@/lib/trainerClients";

type NutritionPlanItem = { id: string; title: string; description?: string | null };

export default function TrainerNutritionPlansPageClient() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<NutritionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<TrainerClient[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, membersRes] = await Promise.all([
        fetch("/api/trainer/nutrition-plans?limit=100", { credentials: "include", cache: "no-store" }),
        fetch("/api/trainer/clients", { credentials: "include", cache: "no-store" }),
      ]);

      if (!plansRes.ok) throw new Error("LOAD_ERROR");
      const data = (await plansRes.json()) as { items?: NutritionPlanItem[] };
      setPlans(data.items ?? []);

      if (membersRes.ok) {
        const membersPayload = (await membersRes.json()) as unknown;
        setMembers(extractTrainerClients(membersPayload));
      } else {
        setMembers([]);
      }
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
      setAssignmentMessage(null);
      await loadPlans();
    } catch {
      setError(t("trainer.error"));
    } finally {
      setCreating(false);
    }
  };

  const assignPlan = async () => {
    if (!selectedPlanId || !selectedMemberId || assigning) return;
    setAssigning(true);
    setAssignmentMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/trainer/members/${selectedMemberId}/nutrition-plan-assignment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nutritionPlanId: selectedPlanId }),
      });

      if (!response.ok) throw new Error("ASSIGN_ERROR");

      const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
      const selectedMember = members.find((member) => member.id === selectedMemberId);
      setAssignmentMessage(
        `Plan \"${selectedPlan?.title ?? ""}\" asignado a ${selectedMember?.name ?? selectedMember?.email ?? "miembro"}.`
      );
      setSelectedPlanId("");
      setSelectedMemberId("");
    } catch {
      setError(t("trainer.error"));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <section className="section-stack" data-testid="trainer-nutrition-plans-page">
      <h1 className="section-title">Planes de nutrición</h1>
      <form className="card form-stack" onSubmit={onSubmit}>
        <h2 style={{ margin: 0 }}>Crear plan de nutrición</h2>
        <label className="form-stack" style={{ gap: 6 }}>
          <span>Título</span>
          <input data-testid="create-nutrition-plan-title-input" value={title} onChange={(event) => setTitle(event.target.value)} required />
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

      <section className="card form-stack" data-testid="trainer-nutrition-plan-assignment">
        <h2 style={{ margin: 0 }}>Asignar plan a miembro</h2>
        <p className="muted" style={{ margin: 0 }}>Selecciona un miembro del gimnasio y el plan a asignar.</p>

        <label className="form-stack" style={{ gap: 6 }}>
          <span>Miembro</span>
          <select
            data-testid="assign-member-select"
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
            disabled={assigning || members.length === 0}
          >
            <option value="">Selecciona un miembro</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.name || member.email || member.id}</option>
            ))}
          </select>
        </label>

        <label className="form-stack" style={{ gap: 6 }}>
          <span>Plan</span>
          <select
            data-testid="assign-plan-select"
            value={selectedPlanId}
            onChange={(event) => setSelectedPlanId(event.target.value)}
            disabled={assigning || plans.length === 0}
          >
            <option value="">Selecciona un plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.title}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn"
          data-testid="assign-nutrition-plan-from-plans-page"
          disabled={assigning || !selectedPlanId || !selectedMemberId}
          onClick={() => void assignPlan()}
        >
          {assigning ? t("ui.loading") : "Asignar plan"}
        </button>

        {members.length === 0 ? <p className="muted">Aún no hay miembros disponibles para asignar.</p> : null}
        {plans.length === 0 ? <p className="muted">Primero crea un plan para poder asignarlo.</p> : null}
        {assignmentMessage ? <p className="muted" data-testid="nutrition-plan-assignment-success">{assignmentMessage}</p> : null}
      </section>
    </section>
  );
}
