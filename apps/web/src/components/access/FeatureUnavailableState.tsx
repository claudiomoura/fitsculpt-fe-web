"use client";

import type { ReactNode } from "react";
import Link from "next/link";
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
    <section className="empty-state card form-stack" role="status" aria-live="polite">
      <h2>{title ?? t("access.notAvailableTitle")}</h2>
      <p className="muted">{description ?? t("access.notAvailableDescription")}</p>
      <div className="empty-state-actions">
        <Link href={backHref} className="btn btn-ghost">
          {t("access.backCta")}
        </Link>
        {actions}
      </div>
    </section>
  );
}
