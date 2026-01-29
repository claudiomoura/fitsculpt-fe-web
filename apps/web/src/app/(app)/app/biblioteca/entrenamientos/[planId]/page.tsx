import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import type { TrainingPlanDetail } from "@/lib/types";
import TrainingPlanDetailClient from "./TrainingPlanDetailClient";
import { getServerT } from "@/lib/serverI18n";

async function fetchTrainingPlan(planId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${getBackendUrl()}/training-plans/${planId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { plan: null, ok: false };
    }
    const data = (await response.json()) as TrainingPlanDetail;
    return { plan: data, ok: true };
  } catch {
    return { plan: null, ok: false };
  }
}

export default async function TrainingPlanDetailPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { t } = await getServerT();
  const { planId } = await props.params;

  if (!planId) {
    return (
      <div className="page">
        <section className="card centered-card">
          <p className="muted">{t("trainingPlans.loadError")}</p>
        </section>
      </div>
    );
  }

  const { plan, ok } = await fetchTrainingPlan(planId);
  const error = ok ? null : t("trainingPlans.loadError");

  return (
    <div className="page">
      <TrainingPlanDetailClient plan={plan} error={error} />
    </div>
  );
}
