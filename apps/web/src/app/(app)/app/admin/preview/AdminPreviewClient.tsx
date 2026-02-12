"use client";

import Link from "next/link";
import PreviewBanner from "@/components/access/PreviewBanner";
import FeatureUnavailableState from "@/components/access/FeatureUnavailableState";
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
      </header>

      <div className="grid cols-3">
        {previewLinks.map((item) => (
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
