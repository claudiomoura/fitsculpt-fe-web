"use client";

import Link from "next/link";
import { LoadingState, EmptyState, ErrorState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import TrainerPlanAssignmentPanel from "@/components/trainer/TrainerPlanAssignmentPanel";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  if (accessLoading || gymLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (canAccessAdminNoGymPanel) {
    return <TrainerAdminNoGymPanel />;
  }

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") {
      return <EmptyState title={t("trainer.gymRequiredTitle")} description={t("trainer.gymRequiredDesc")} wrapInCard icon="info" />;
    }

    if (gymError) {
      return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => window.location.reload()} wrapInCard />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <div className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
        {membership.gymName ? <p className="muted" style={{ margin: 0 }}>{membership.gymName}</p> : null}
      </div>

      <section className="card form-stack" aria-labelledby="trainer-requests-title">
        <h2 id="trainer-requests-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.requests.title")}
        </h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.requests.description")}</p>
        <Link href="/app/trainer/requests" className="btn secondary fit-content">
          {t("trainer.requests.openList")}
        </Link>
      </section>

      <section className="card form-stack" aria-labelledby="trainer-clients-title">
        <h2 id="trainer-clients-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.clients.title")}
        </h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.clients.description")}</p>
        <Link href="/app/trainer/clients" className="btn secondary fit-content">
          {t("trainer.clients.openList")}
        </Link>
      </section>

      <section className="card form-stack" aria-labelledby="trainer-plans-title">
        <h2 id="trainer-plans-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.plans.title")}
        </h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.description")}</p>
        <Link href="/app/trainer/plans" className="btn secondary fit-content">
          {t("trainer.plans.openList")}
        </Link>
      </section>

      <TrainerPlanAssignmentPanel />
    </div>
  );
}
