"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { extractTrainerClients, type TrainerClient } from "@/lib/trainerClients";

type NutritionPlanItem = {
  id: string;
  title: string;
  startDate?: string;
  daysCount?: number;
};

type RecipeItem = {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  category?: string | null;
};

type MealType = "breakfast" | "lunch" | "snack" | "dinner";

type DayMealSelection = Partial<Record<MealType, string>>;

const MEAL_TYPE_OPTIONS: Array<{ type: MealType; label: string }> = [
  { type: "breakfast", label: "Desayuno" },
  { type: "lunch", label: "Comida" },
  { type: "snack", label: "Snack" },
  { type: "dinner", label: "Cena" },
];

function dayLabel(dayIndex: number) {
  const week = Math.floor(dayIndex / 7) + 1;
  const day = (dayIndex % 7) + 1;
  return `Semana ${week} · Día ${day}`;
}

function normalizeMealSelectionShape(daysCount: number, current: Record<number, DayMealSelection>) {
  const next: Record<number, DayMealSelection> = {};
  for (let dayIndex = 0; dayIndex < daysCount; dayIndex += 1) {
    next[dayIndex] = current[dayIndex] ?? {};
  }
  return next;
}

export default function TrainerNutritionPlansPageClient() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<NutritionPlanItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionsError, setPermissionsError] = useState(false);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weeks, setWeeks] = useState(4);
  const [dailyCalories, setDailyCalories] = useState(2200);
  const [proteinG, setProteinG] = useState(140);
  const [carbsG, setCarbsG] = useState(240);
  const [fatG, setFatG] = useState(70);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [dayMeals, setDayMeals] = useState<Record<number, DayMealSelection>>({});

  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<TrainerClient[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

  const daysCount = Math.max(1, weeks * 7);

  useEffect(() => {
    setDayMeals((prev) => normalizeMealSelectionShape(daysCount, prev));
    setSelectedDayIndex((prev) => Math.min(prev, daysCount - 1));
  }, [daysCount]);

  const selectedDayMeals = useMemo(() => dayMeals[selectedDayIndex] ?? {}, [dayMeals, selectedDayIndex]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setPermissionsError(false);

    try {
      const [plansRes, membersRes, recipesRes] = await Promise.all([
        fetch("/api/trainer/nutrition-plans?limit=100", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/trainer/clients", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/recipes?limit=200", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const trainerPermissionsIssue = plansRes.status === 401 || plansRes.status === 403;
      if (plansRes.ok) {
        const plansData = (await plansRes.json()) as { items?: NutritionPlanItem[] };
        setPlans(plansData.items ?? []);
      } else {
        setPlans([]);
        setPermissionsError(trainerPermissionsIssue);
      }

      if (membersRes.ok) {
        const membersPayload = (await membersRes.json()) as unknown;
        setMembers(extractTrainerClients(membersPayload));
      } else {
        setMembers([]);
      }

      if (recipesRes.ok) {
        const recipesPayload = (await recipesRes.json()) as { items?: RecipeItem[] };
        setRecipes(recipesPayload.items ?? []);
      } else {
        setRecipes([]);
      }

      if (!plansRes.ok) {
        setError(
          trainerPermissionsIssue
            ? "No se pudieron validar los permisos de entrenador ahora mismo."
            : t("trainer.error"),
        );
      }
    } catch {
      setError(t("trainer.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateMealForDay = (dayIndex: number, type: MealType, recipeId: string) => {
    setDayMeals((prev) => {
      const day = { ...(prev[dayIndex] ?? {}) };
      if (!recipeId) {
        delete day[type];
      } else {
        day[type] = recipeId;
      }
      return {
        ...prev,
        [dayIndex]: day,
      };
    });
  };

  const applyCurrentDayToAllDays = () => {
    const source = dayMeals[selectedDayIndex] ?? {};
    setDayMeals((prev) => {
      const next = { ...prev };
      for (let dayIndex = 0; dayIndex < daysCount; dayIndex += 1) {
        next[dayIndex] = { ...source };
      }
      return next;
    });
  };

  const clearCurrentDay = () => {
    setDayMeals((prev) => ({ ...prev, [selectedDayIndex]: {} }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || creating) return;

    setCreating(true);
    setError(null);
    try {
      const days = Array.from({ length: daysCount }).map((_, dayIndex) => {
        const mealsSelection = dayMeals[dayIndex] ?? {};
        const meals = MEAL_TYPE_OPTIONS
          .map(({ type }) => {
            const recipeId = mealsSelection[type];
            if (!recipeId) return null;
            return {
              type,
              recipeId,
            };
          })
          .filter(Boolean) as Array<{ type: MealType; recipeId: string }>;

        return {
          dayIndex,
          dayLabel: dayLabel(dayIndex),
          meals,
        };
      });

      const response = await fetch("/api/trainer/nutrition-plans", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startDate,
          weeks,
          daysCount,
          dailyCalories,
          proteinG,
          carbsG,
          fatG,
          days,
        }),
      });

      if (!response.ok) {
        throw new Error("CREATE_ERROR");
      }

      setTitle("");
      setWeeks(4);
      setDailyCalories(2200);
      setProteinG(140);
      setCarbsG(240);
      setFatG(70);
      setSelectedDayIndex(0);
      setDayMeals({});
      setAssignmentMessage(null);

      await loadData();
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
      const response = await fetch(
        `/api/trainer/clients/${selectedMemberId}/assigned-nutrition-plan`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nutritionPlanId: selectedPlanId }),
        },
      );

      if (!response.ok) throw new Error("ASSIGN_ERROR");

      const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
      const selectedMember = members.find((member) => member.id === selectedMemberId);
      setAssignmentMessage(
        `Plan "${selectedPlan?.title ?? ""}" asignado a ${selectedMember?.name ?? selectedMember?.email ?? "miembro"}.`,
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
        <p className="muted" style={{ margin: 0 }}>
          Define semanas y selecciona recetas por día y por comida (desayuno, comida, snack y cena).
        </p>

        <label className="form-stack" style={{ gap: 6 }}>
          <span>Título</span>
          <input
            data-testid="create-nutrition-plan-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <div className="grid" style={{ gridTemplateColumns: "repeat(5, minmax(120px, 1fr))", gap: 10 }}>
          <label className="form-stack" style={{ gap: 6 }}>
            <span>Inicio</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="form-stack" style={{ gap: 6 }}>
            <span>Semanas</span>
            <input
              type="number"
              min={1}
              max={12}
              value={weeks}
              onChange={(event) => setWeeks(Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
            />
          </label>
          <label className="form-stack" style={{ gap: 6 }}>
            <span>Kcal / día</span>
            <input
              type="number"
              min={1000}
              max={5000}
              value={dailyCalories}
              onChange={(event) => setDailyCalories(Math.max(1000, Number(event.target.value) || 2000))}
            />
          </label>
          <label className="form-stack" style={{ gap: 6 }}>
            <span>Proteína (g)</span>
            <input
              type="number"
              min={0}
              max={300}
              value={proteinG}
              onChange={(event) => setProteinG(Math.max(0, Number(event.target.value) || 0))}
            />
          </label>
          <label className="form-stack" style={{ gap: 6 }}>
            <span>Carbs / Grasas (g)</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <input
                type="number"
                min={0}
                max={500}
                value={carbsG}
                onChange={(event) => setCarbsG(Math.max(0, Number(event.target.value) || 0))}
              />
              <input
                type="number"
                min={0}
                max={300}
                value={fatG}
                onChange={(event) => setFatG(Math.max(0, Number(event.target.value) || 0))}
              />
            </div>
          </label>
        </div>

        <div className="card" style={{ border: "1px solid var(--surface-border-default)", padding: 12 }}>
          <div className="inline-actions-sm" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <strong>Planificación diaria</strong>
            <span className="muted">{daysCount} días totales</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginTop: 10 }}>
            {Array.from({ length: daysCount }).map((_, dayIndex) => {
              const isActive = dayIndex === selectedDayIndex;
              const mealCount = Object.values(dayMeals[dayIndex] ?? {}).filter(Boolean).length;
              return (
                <button
                  key={dayIndex}
                  type="button"
                  className={`btn ${isActive ? "" : "secondary"}`}
                  style={{ height: 44, justifyContent: "space-between", paddingInline: 10 }}
                  onClick={() => setSelectedDayIndex(dayIndex)}
                >
                  <span>D{dayIndex + 1}</span>
                  <span className="badge">{mealCount}/4</span>
                </button>
              );
            })}
          </div>

          <div className="card" style={{ marginTop: 12, border: "1px solid var(--surface-border-default)", padding: 12 }}>
            <div className="inline-actions-sm" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <strong>{dayLabel(selectedDayIndex)}</strong>
              <div className="inline-actions-sm">
                <button type="button" className="btn secondary" onClick={clearCurrentDay}>Limpiar día</button>
                <button type="button" className="btn secondary" onClick={applyCurrentDayToAllDays}>Aplicar a todos</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
              {MEAL_TYPE_OPTIONS.map(({ type, label }) => (
                <label key={type} className="form-stack" style={{ gap: 6 }}>
                  <span>{label}</span>
                  <select
                    value={selectedDayMeals[type] ?? ""}
                    onChange={(event) => updateMealForDay(selectedDayIndex, type, event.target.value)}
                    disabled={recipes.length === 0}
                  >
                    <option value="">Sin receta</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {recipes.length === 0 ? (
              <p className="muted" style={{ margin: "10px 0 0" }}>
                No hay recetas cargadas en la biblioteca todavía. Crea o importa recetas en /app/biblioteca/recetas.
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="submit"
          className="btn"
          data-testid="create-nutrition-plan-button"
          disabled={creating || !title.trim()}
        >
          {creating ? t("ui.loading") : "Crear plan de nutrición"}
        </button>
      </form>

      <section className="card form-stack" data-testid="nutrition-plan-list">
        <h2 style={{ margin: 0 }}>Planes del gimnasio</h2>
        {loading ? <p className="muted">{t("common.loading")}</p> : null}
        {error ? <p className="muted">{error}</p> : null}
        {permissionsError ? (
          <p className="muted">
            Verifica que tu usuario tenga membresía activa como TRAINER/ADMIN en un gimnasio.
          </p>
        ) : null}
        {!loading && !error && plans.length === 0 ? (
          <p className="muted">No hay planes de nutrición todavía.</p>
        ) : null}
        {!loading && !error && plans.length > 0 ? (
          <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
            {plans.map((plan) => (
              <li key={plan.id}>
                <strong>{plan.title}</strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {plan.daysCount ?? 0} días · {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : "Sin fecha"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card form-stack" data-testid="trainer-nutrition-plan-assignment">
        <h2 style={{ margin: 0 }}>Asignar plan a miembro</h2>
        <p className="muted" style={{ margin: 0 }}>
          Selecciona un miembro del gimnasio y el plan a asignar.
        </p>

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
              <option key={member.id} value={member.id}>
                {member.name || member.email || member.id}
              </option>
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
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
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

        {members.length === 0 ? (
          <p className="muted">Aún no hay miembros disponibles para asignar.</p>
        ) : null}
        {plans.length === 0 ? (
          <p className="muted">Primero crea un plan para poder asignarlo.</p>
        ) : null}
        {assignmentMessage ? (
          <p className="muted" data-testid="nutrition-plan-assignment-success">
            {assignmentMessage}
          </p>
        ) : null}
      </section>
    </section>
  );
}
