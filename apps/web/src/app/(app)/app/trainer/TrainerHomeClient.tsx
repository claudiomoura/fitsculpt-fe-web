"use client";

import { EmptyState, ErrorState } from "@/components/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import TrainerDashboardContent from "@/components/trainer-dashboard/TrainerDashboardContent";
import TrainerDashboardSkeleton from "@/components/trainer-dashboard/TrainerDashboardSkeleton";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import TrainerGymRequiredState from "@/components/trainer/TrainerGymRequiredState";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";
import { useLanguage } from "@/context/LanguageProvider";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  if (accessLoading || gymLoading) {
    return <TrainerDashboardSkeleton />;
  }

  if (canAccessAdminNoGymPanel) {
    return <TrainerAdminNoGymPanel />;
  }

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") {
      return <TrainerGymRequiredState />;
    }

    if (gymError) {
      return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => window.location.reload()} wrapInCard />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <Card>
        <CardHeader>
          <CardTitle>{t("trainer.dashboard.header.title")}</CardTitle>
          <CardDescription>{t("trainer.dashboard.header.description")}</CardDescription>
        </CardHeader>
        <CardContent className="form-stack" style={{ gap: 4 }}>
          <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
          {membership.gymName ? <p className="muted" style={{ margin: 0 }}>{membership.gymName}</p> : null}
        </CardContent>
      </Card>

      {gymError ? (
        <ErrorState title={t("trainer.dashboard.error.title")} description={t("trainer.dashboard.error.description")} wrapInCard />
      ) : null}

      <TrainerDashboardContent t={t} />
    </div>
  );
}
