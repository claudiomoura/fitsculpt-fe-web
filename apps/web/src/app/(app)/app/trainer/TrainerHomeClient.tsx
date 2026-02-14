"use client";

import Link from "next/link";
import { EmptyState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { canAccessTrainerGymArea } from "@/lib/gymMembership";
import { useAccess } from "@/lib/useAccess";
import { useGymMembership } from "@/lib/useGymMembership";
import TrainerPlanAssignmentPanel from "@/components/trainer/TrainerPlanAssignmentPanel";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isCoach, isAdmin, isLoading: accessLoading } = useAccess();
  const { membership, isLoading: gymLoading } = useGymMembership();

  const canAccessTrainer = canAccessTrainerGymArea({ isCoach, isAdmin, membership });

  if (accessLoading || gymLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (!canAccessTrainer) {
    if (membership.state === "not_in_gym") {
      return <EmptyState title={t("trainer.gymRequiredTitle")} description={t("trainer.gymRequiredDesc")} wrapInCard icon="info" />;
    }

    if (membership.state === "unknown") {
      return <EmptyState title={t("trainer.gymUnknownTitle")} description={t("trainer.gymUnknownDesc")} wrapInCard icon="info" />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <div className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
      </div>

      <section className="card form-stack" aria-labelledby="trainer-clients-title">
        <h2 id="trainer-clients-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.clients.title")}
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clients.description")}
        </p>
        <Link href="/app/trainer/clients" className="btn secondary fit-content">
          {t("trainer.clients.openList")}
        </Link>
      </section>

      <section className="card form-stack" aria-labelledby="trainer-athlete-context-title">
        <h3 id="trainer-athlete-context-title" style={{ margin: 0 }}>
          {t("trainer.clientContext.title")}
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clientContext.nextStep")}
        </p>
      </section>

      <TrainerPlanAssignmentPanel />
    </div>
  );
}
