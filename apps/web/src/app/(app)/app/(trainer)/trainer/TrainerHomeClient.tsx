"use client";

import { EmptyState, ErrorState } from "@/components/states";
import TrainerHubLayout from "@/components/trainer/TrainerHubLayout";
import TrainerHubLockedCard from "@/components/trainer/TrainerHubLockedCard";
import TrainerHubSkeleton from "@/components/trainer/TrainerHubSkeleton";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";
import { useLanguage } from "@/context/LanguageProvider";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  if (accessLoading || gymLoading) {
    return <TrainerHubSkeleton />;
  }

  if (canAccessAdminNoGymPanel) {
    return <TrainerAdminNoGymPanel />;
  }

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") {
      return <TrainerHubLockedCard />;
    }

    if (gymError) {
      return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => window.location.reload()} wrapInCard />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <>
      {gymError ? <ErrorState title={t("trainer.dashboard.error.title")} description={t("trainer.dashboard.error.description")} wrapInCard /> : null}
      <TrainerHubLayout t={t} gymName={membership.gymName} hasGymRoute hasRequestsRoute />
    </>
  );
}
