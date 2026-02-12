"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";

type FeatureUnavailableStateProps = {
  backHref?: string;
};

export default function FeatureUnavailableState({
  backHref = "/app/trainer",
}: FeatureUnavailableStateProps) {
  const { t } = useLanguage();

  return (
    <div className="card form-stack" role="status" aria-live="polite">
      <p className="muted" style={{ margin: 0 }}>
        {t("trainer.clientContext.unavailable")}
      </p>
      <Link href={backHref} className="btn secondary" style={{ width: "fit-content", minHeight: 44 }}>
        {t("trainer.back")}
      </Link>
    </div>
  );
}
