import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import type { TrainingPlanDetail } from "@/lib/types";
import TrainingPlanDetailClient from "./TrainingPlanDetailClient";

async function fetchTrainingPlan(planId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${getBackendUrl()}/training-plans/${planId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { plan: null, error: "No se pudo cargar el plan." };
    }
    const data = (await response.json()) as TrainingPlanDetail;
    return { plan: data, error: null };
  } catch {
    return { plan: null, error: "No se pudo cargar el plan." };
  }
}

export default async function TrainingPlanDetailPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;

  if (!planId) {
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">No se pudo cargar el plan.</p>
        </section>
      </div>
    );
  }

  const { plan, error } = await fetchTrainingPlan(planId);

  return (
    <div className="page">
      <TrainingPlanDetailClient plan={plan} error={error} />
    </div>
  );
}
