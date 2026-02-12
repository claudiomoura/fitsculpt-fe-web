"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import type { ClientRow } from "@/components/trainer/types";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";

type LoadState = "loading" | "ready" | "error";
type ClientsResponse = { users?: ClientRow[] };

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isCoach, isAdmin, isLoading: accessLoading } = useAccess();

  const [clientsState, setClientsState] = useState<LoadState>("loading");
  const [clients, setClients] = useState<ClientRow[]>([]);

  const canAccessTrainer = isCoach || isAdmin;

  const loadClients = useCallback(async () => {
    setClientsState("loading");
    try {
      const response = await fetch("/api/admin/users?page=1", { cache: "no-store" });
      if (!response.ok) {
        setClientsState("error");
        return;
      }

      const data = (await response.json()) as ClientsResponse;
      const users = Array.isArray(data.users) ? data.users : [];
      setClients(users.filter((user) => user.role !== "ADMIN"));
      setClientsState("ready");
    } catch {
      setClientsState("error");
    }
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
          <p className="muted">No clients yet</p>
        </div>
      );
    }

    return (
      <ul className="form-stack" aria-label={t("trainer.clients.title")}>
        {clients.map((client) => {
          const statusText = client.isBlocked ? t("trainer.clients.blocked") : t("trainer.clients.active");

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
