"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";

type AdminSummary = {
  total?: number;
};

export default function AdminDashboardClient() {
  const { t } = useLanguage();
  const { isAdmin, isLoading: roleLoading, error: roleError } = useAccess();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState(false);

  useEffect(() => {
    if (roleLoading || !isAdmin) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      setRequestError(false);

      try {
        const response = await fetch("/api/admin/users?page=1", { cache: "no-store" });
        if (!response.ok) {
          if (active) setRequestError(true);
          return;
        }

        const data = (await response.json()) as { total?: number };
        if (active) {
          setSummary({ total: data.total ?? 0 });
        }
      } catch {
        if (active) setRequestError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [isAdmin, roleLoading]);

  if (roleLoading) {
    return <p className="muted">{t("admin.loading")}</p>;
  }

  if (roleError) {
    return <p className="muted">{t("admin.unauthorized")}</p>;
  }

  if (!isAdmin) {
    return <p className="muted">{t("admin.unauthorized")}</p>;
  }

  if (loading) {
    return <p className="muted">{t("admin.loading")}</p>;
  }

  if (requestError) {
    return <p className="muted">{t("admin.usersError")}</p>;
  }

  return (
    <div className="list-grid">
      <div className="feature-card">
        <div className="info-label">{t("admin.totalUsers")}</div>
        <div className="info-value">{summary?.total ?? 0}</div>
      </div>
      <div className="feature-card">
        <div className="info-label">{t("admin.management")}</div>
        <Link href="/app/admin/users" className="btn secondary">
          {t("admin.viewUsers")}
        </Link>
      </div>
      <div className="feature-card">
        <div className="info-label">{t("admin.actions")}</div>
        <p className="muted">{t("admin.actionsHint")}</p>
      </div>
    </div>
  );
}
