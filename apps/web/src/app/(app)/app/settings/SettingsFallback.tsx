"use client";

import { LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";

export default function SettingsFallback() {
  const { t } = useLanguage();

  return <LoadingState ariaLabel={t("settings.loadingAria")} title={t("settings.loadingTitle")} lines={4} />;
}
