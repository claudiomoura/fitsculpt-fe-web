"use client";

import Link from "next/link";
import { EmptyState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isCoach, isAdmin, isLoading: accessLoading } = useAccess();

  const canAccessTrainer = isCoach || isAdmin;

  if (accessLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (!canAccessTrainer) {
    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <div className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
      </div>

      <section className="card form-stack" aria-labelledby="trainer-clients-title">
        <h2 id="trainer-clients-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.clients.title")}
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clients.description")}
        </p>
        <Link href="/app/trainer/clients" className="btn secondary fit-content">
          {t("trainer.clients.openList")}
        </Link>
      </section>

      <section className="card form-stack" aria-labelledby="trainer-athlete-context-title">
        <h3 id="trainer-athlete-context-title" style={{ margin: 0 }}>
          {t("trainer.clientContext.title")}
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clientContext.nextStep")}
        </p>
      </section>
    </div>
  );
}
