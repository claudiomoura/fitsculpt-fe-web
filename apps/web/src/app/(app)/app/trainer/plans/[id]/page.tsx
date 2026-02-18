import Link from "next/link";
import { cookies } from "next/headers";
import { getServerT } from "@/lib/serverI18n";
import { getBackendUrl } from "@/lib/backend";
import type { TrainingPlanDetail } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchPlan(id: string): Promise<TrainingPlanDetail | null> {
  const token = (await cookies()).get("fs_token")?.value;
  const authCookie = token ? `fs_token=${token}` : "";

  try {
    const response = await fetch(`${getBackendUrl()}/training-plans/${id}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as TrainingPlanDetail;
  } catch {
    return null;
  }
}

export default async function TrainerPlanDetailPage({ params }: Props) {
  const { t } = await getServerT();
  const { id } = await params;
  const plan = await fetchPlan(id);

  return (
    <section className="section-stack">
      <header className="form-stack">
        <h1 className="section-title">{t("trainer.plans.title")}</h1>
        <Link className="btn secondary fit-content" href="/app/trainer/plans">{t("trainer.back")}</Link>
      </header>

      {!plan ? (
        <section className="card form-stack">
          <p className="muted">{t("trainer.plans.error")}</p>
        </section>
      ) : (
        <section className="card form-stack">
          <h2 style={{ margin: 0 }}>{plan.title}</h2>
          <p className="muted" style={{ margin: 0 }}>{t("training.daysPerWeek")}: {plan.daysPerWeek}</p>
          {(plan.days ?? []).length === 0 ? (
            <p className="muted">{t("trainer.plans.dayExercisesEmpty")}</p>
          ) : (
            <div className="form-stack">
              {plan.days.map((day) => (
                <article key={day.id} className="feature-card form-stack">
                  <strong>{day.label}</strong>
                  {day.exercises.length === 0 ? (
                    <p className="muted">{t("trainer.plans.dayExercisesEmpty")}</p>
                  ) : (
                    <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                      {day.exercises.map((exercise) => (
                        <li key={exercise.id}>{exercise.name}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
