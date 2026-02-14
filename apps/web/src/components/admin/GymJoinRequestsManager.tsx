"use client";

import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";

export default function GymJoinRequestsManager() {
  const { t } = useLanguage();
  const { isAdmin, isDev, isLoading: accessLoading } = useAccess();

  if (accessLoading) {
    return <p className="muted">{t("admin.gymRequestsLoading")}</p>;
  }

  if (!isAdmin && !isDev) {
    return <p className="muted">{t("admin.unauthorized")}</p>;
  }

  return (
    <div className="status-card">
      <strong>{t("access.notAvailableTitle")}</strong>
      <p className="muted">{t("access.notAvailableDescription")}</p>
    </div>
  );
}
