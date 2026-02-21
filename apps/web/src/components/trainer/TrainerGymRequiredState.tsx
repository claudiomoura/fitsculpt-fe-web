"use client";

import { EmptyState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";

export default function TrainerGymRequiredState() {
  const { t } = useLanguage();

  return (
    <EmptyState
      title={t("trainer.gymRequiredTitle")}
      description={t("trainer.gymRequiredDesc")}
      wrapInCard
      icon="info"
      actions={[{ label: t("nav.gym"), href: "/app/gym" }]}
    />
  );
}
