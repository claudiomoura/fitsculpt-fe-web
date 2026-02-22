"use client";

import type { ReactNode } from "react";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { canAccessFeature, type EntitlementFeature } from "@/lib/entitlements";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";

type FeatureGateProps = {
  feature: EntitlementFeature;
  children: ReactNode;
  upgradeHref: string;
};

export function FeatureGate({ feature, children, upgradeHref }: FeatureGateProps) {
  const { t } = useLanguage();
  const { entitlements, loading, error, reload } = useAuthEntitlements();

  if (loading) {
    return <LoadingState ariaLabel={t("ui.loading")} title={t("ui.loading")} showCard={false} lines={3} />;
  }

  if (error) {
    return <ErrorState title={t("common.error")} description={error} retryLabel={t("common.retry")} onRetry={() => void reload()} wrapInCard />;
  }

  if (!canAccessFeature(entitlements, feature)) {
    return (
      <EmptyState
        title={t("common.upgradeRequired")}
        description={t("common.upgradeRequiredDescription")}
        actions={[{ label: t("billing.upgradePro"), href: upgradeHref, variant: "primary" }]}
        wrapInCard
      />
    );
  }

  return <>{children}</>;
}
