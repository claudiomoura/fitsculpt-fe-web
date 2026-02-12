"use client";

import { useLanguage } from "@/context/LanguageProvider";

export default function PreviewBanner() {
  const { t } = useLanguage();

  return <span className="badge">{t("access.previewBadge")}</span>;
}
