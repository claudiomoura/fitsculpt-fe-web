"use client";

import { useLanguage } from "@/context/LanguageProvider";

export default function BillingFallback() {
  const { t } = useLanguage();
  return <p className="muted">{t("billing.loadingBilling")}</p>;
}
