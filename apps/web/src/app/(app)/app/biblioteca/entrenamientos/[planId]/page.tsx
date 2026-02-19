import { headers } from "next/headers";
import type { TrainingPlanDetail } from "@/lib/types";
import TrainingPlanDetailClient from "./TrainingPlanDetailClient";
import { getServerT } from "@/lib/serverI18n";

async function fetchTrainingPlan(planId: string) {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const proto = requestHeaders.get("x-forwarded-proto") ?? "http";

    if (!host) return { plan: null, ok: false };

    const response = await fetch(`${proto}://${host}/api/training-plans/${planId}`, {
      cache: "no-store",
      headers: { cookie: requestHeaders.get("cookie") ?? "" },
    });

    if (!response.ok) {
      return { plan: null, ok: false };
    }

    const data = (await response.json()) as TrainingPlanDetail;
    return { plan: data, ok: true };
  } catch (_err) {
    return { plan: null, ok: false };
  }
}

export default async function TrainingPlanDetailPage(props: {
  params: Promise<{ planId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { t } = await getServerT();
  const { planId } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const fromToday = searchParams?.from === "hoy";

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
      <TrainingPlanDetailClient
        plan={plan}
        error={error}
        backHref={fromToday ? "/app/hoy" : "/app/biblioteca/entrenamientos"}
        backLabel={fromToday ? t("today.backToToday") : t("trainingPlans.backToTrainingPlans")}
      />
    </div>
  );
}
