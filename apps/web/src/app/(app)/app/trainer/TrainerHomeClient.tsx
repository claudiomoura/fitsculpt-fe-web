"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import { probeTrainerClientsCapability } from "@/lib/trainerCapability";
import type { TrainerClient } from "@/lib/trainerClients";

type LoadState = "loading" | "ready" | "error" | "unavailable";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isCoach, isAdmin, isLoading: accessLoading } = useAccess();

  const [clientsState, setClientsState] = useState<LoadState>("loading");
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  const canAccessTrainer = isCoach || isAdmin;

  const loadClients = useCallback(async () => {
    setClientsState("loading");
    setActiveEndpoint(null);

    const result = await probeTrainerClientsCapability();

    if (result.status === "supported") {
      setClients(result.clients);
      setActiveEndpoint(result.endpoint);
      setClientsState("ready");
      return;
    }

    if (result.status === "unavailable") {
      setClients([]);
      setClientsState("unavailable");
      return;
    }

    setClientsState("error");
    setActiveEndpoint(result.endpoint ?? null);
  }, []);

  useEffect(() => {
    if (!canAccessTrainer) return;
    const timeoutId = setTimeout(() => {
      void loadClients();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [canAccessTrainer, loadClients]);

  const listBody = useMemo(() => {
    if (clientsState === "loading") {
      return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
    }

    if (clientsState === "unavailable") {
      return (
        <div className="card form-stack" role="status" aria-live="polite">
          <h3 style={{ margin: 0 }}>{t("trainer.unavailableTitle")}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {t("trainer.unavailableDesc")}
          </p>
        </div>
      );
    }

    if (clientsState === "error") {
      return (
        <ErrorState
          title={t("trainer.clients.error")}
          retryLabel={t("ui.retry")}
          onRetry={() => void loadClients()}
          wrapInCard
        />
      );
    }

    if (!clients.length) {
      return (
        <div className="card" role="status" aria-live="polite">
          <p className="muted">{t("trainer.clients.empty")}</p>
        </div>
      );
    }

    return (
      <ul className="form-stack" aria-label={t("trainer.clients.title")}>
        {clients.map((client) => {
          const statusText =
            client.isBlocked === true
              ? t("trainer.clients.blocked")
              : client.isBlocked === false
                ? t("trainer.clients.active")
                : t("trainer.clients.unknownStatus");

          return (
            <li key={client.id} className="card">
              <Link href={`/app/trainer/clients/${client.id}`} className="sidebar-link" style={{ display: "block" }}>
                <strong>{client.name || t("trainer.clients.empty")}</strong>
              </Link>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {statusText}
                {client.subscriptionStatus ? ` · ${client.subscriptionStatus}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    );
  }, [clients, clientsState, loadClients, t]);

  if (accessLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (!canAccessTrainer) {
    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="lock" />;
  }

  return (
    <div className="form-stack">
      <div className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
        {activeEndpoint ? (
          <p className="muted" style={{ margin: 0 }}>
            {t("trainer.clientsEndpointPrefix")} {activeEndpoint}
          </p>
        ) : null}
      </div>

      <section className="section-stack" aria-labelledby="trainer-clients-title">
        <h2 id="trainer-clients-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.clients.title")}
        </h2>
        {listBody}
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
