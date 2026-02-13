"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PreviewBanner from "@/components/access/PreviewBanner";
import FeatureUnavailableState from "@/components/access/FeatureUnavailableState";
import {
  ADMIN_TESTER_MODE_KEY,
  isTesterModeEnabled,
} from "@/config/featureFlags";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";

const previewLinks = [
  { id: "today", href: "/app/hoy", labelKey: "nav.today" },
  { id: "plan", href: "/app/entrenamiento", labelKey: "nav.trainingPlan" },
  { id: "tracking", href: "/app/seguimiento", labelKey: "nav.tracking" },
  { id: "nutrition", href: "/app/nutricion", labelKey: "nav.nutrition" },
  { id: "library", href: "/app/biblioteca", labelKey: "nav.library" },
  { id: "trainer", href: "/app/trainer", labelKey: "nav.trainer" },
];

export default function AdminPreviewClient() {
  const { t } = useLanguage();
  const { isAdmin, isLoading } = useAccess();
  const [testerModeEnabled, setTesterModeEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return isTesterModeEnabled(window.localStorage.getItem(ADMIN_TESTER_MODE_KEY));
  });

  const previewHrefSuffix = testerModeEnabled ? "?preview=admin-dev&tester=on" : "";

  const links = useMemo(
    () =>
      previewLinks.map((item) => ({
        ...item,
        href: item.id === "trainer" ? `${item.href}${previewHrefSuffix}` : item.href,
      })),
    [previewHrefSuffix],
  );

  const handleTesterModeToggle = () => {
    if (!isAdmin) return;

    const nextValue = !testerModeEnabled;
    setTesterModeEnabled(nextValue);

    if (nextValue) {
      window.localStorage.setItem(ADMIN_TESTER_MODE_KEY, "enabled");
      return;
    }

    window.localStorage.removeItem(ADMIN_TESTER_MODE_KEY);
  };

  if (isLoading) {
    return (
      <section className="card form-stack" role="status" aria-live="polite">
        <p className="muted">{t("ui.loading")}</p>
      </section>
    );
  }

  if (!isAdmin) {
    return <FeatureUnavailableState backHref="/app" />;
  }

  return (
    <section className="form-stack">
      <header className="card form-stack">
        <PreviewBanner />
        <h1>{t("access.adminPreviewTitle")}</h1>
        <p className="muted">{t("access.adminPreviewDescription")}</p>
        <label className="form-row" style={{ alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={testerModeEnabled} onChange={handleTesterModeToggle} />
          <span>{t("access.testerModeToggle")}</span>
        </label>
      </header>

      <div className="grid cols-3">
        {links.map((item) => (
          <article key={item.id} className="feature-card form-stack">
            <h3>{t(item.labelKey)}</h3>
            <p className="muted">{t("access.previewCardDescription")}</p>
            <Link href={item.href} className="btn btn-ghost">
              {t("ui.open")}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
