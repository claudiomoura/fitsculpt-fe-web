"use client";

import { EmptyState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";

type FeatureUnavailableStateProps = {
  backHref?: string;
};

export default function FeatureUnavailableState({
  backHref = "/app/trainer",
}: FeatureUnavailableStateProps) {
  const { t } = useLanguage();

  return (
    <EmptyState
      title={t("trainer.clientContext.unavailable")}
      wrapInCard
      actions={[
        {
          label: t("trainer.back"),
          href: backHref,
          variant: "secondary",
          className: "fit-content",
        },
      ]}
    />
  );
}
