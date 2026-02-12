"use client";

import type { ReactNode } from "react";
import { EmptyState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";

type Props = {
  title?: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
};

export default function FeatureUnavailableState({
  title,
  description,
  backHref = "/app",
  actions,
}: Props) {
  const { t } = useLanguage();

  return (
    <EmptyState
      title={title ?? t("access.notAvailableTitle")}
      description={description ?? t("access.notAvailableDescription")}
      wrapInCard
      actions={[
        {
          label: t("access.backCta"),
          href: backHref,
          variant: "ghost",
        },
      ]}
    >
      {actions ? <div className="empty-state-actions">{actions}</div> : null}
    </EmptyState>
  );
}
