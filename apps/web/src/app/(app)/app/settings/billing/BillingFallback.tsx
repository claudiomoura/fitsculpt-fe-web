"use client";

import { LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";

export default function BillingFallback() {
  const { t } = useLanguage();

  return <LoadingState ariaLabel={t("billing.loadingBilling")} title={t("billing.loadingBilling")} showCard={false} />;
}
