"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PreviewBanner from "@/components/access/PreviewBanner";
import {
  ADMIN_TESTER_MODE_KEY,
  isTesterModeEnabled,
  resolveTesterModeFromQueryParam,
} from "@/config/featureFlags";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import {
  canUseTrainerDemoPreview,
  getTrainerDemoClients,
  probeTrainerClientsCapability,
} from "@/lib/trainerCapability";
import type { TrainerClient } from "@/lib/trainerClients";

type LoadState = "loading" | "ready" | "error" | "unavailable";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isCoach, isAdmin, isLoading: accessLoading } = useAccess();
  const searchParams = useSearchParams();

  const [clientsState, setClientsState] = useState<LoadState>("loading");
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [testerModeEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return isTesterModeEnabled(window.localStorage.getItem(ADMIN_TESTER_MODE_KEY));
  });

  const canAccessTrainer = isCoach || isAdmin;

  const loadClients = useCallback(async () => {
    setClientsState("loading");
    setActiveEndpoint(null);
    setIsDemoMode(false);

    const result = await probeTrainerClientsCapability();

    if (result.status === "supported") {
      setClients(result.clients);
      setActiveEndpoint(result.endpoint);
      setClientsState("ready");
      return;
    }

    if (result.status === "unavailable") {
      const previewMode = searchParams.get("preview");
      const testerModeFromQuery = resolveTesterModeFromQueryParam(searchParams.get("tester"));
      const canUseTesterPreview = isAdmin && testerModeEnabled && testerModeFromQuery;

      if (canUseTesterPreview && canUseTrainerDemoPreview(previewMode)) {
        setClients(getTrainerDemoClients());
        setIsDemoMode(true);
        setClientsState("ready");
        return;
      }

      setClients([]);
      setClientsState("unavailable");
      return;
    }

    setClientsState("error");
    setActiveEndpoint(result.endpoint ?? null);
  }, [isAdmin, searchParams, testerModeEnabled]);

  useEffect(() => {
    if (!canAccessTrainer) return;
    const timeoutId = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canAccessTrainer, loadClients]);

  const listBody = useMemo(() => {
    if (clientsState === "loading") {
      return <p className="muted">{t("trainer.loading")}</p>;
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
        <div className="card form-stack" role="status" aria-live="polite">
          <p className="muted">{t("trainer.clients.error")}</p>
          <button type="button" className="btn secondary" style={{ minHeight: 44 }} onClick={() => void loadClients()}>
            {t("ui.retry")}
          </button>
        </div>
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
              <strong>{client.name || t("trainer.clients.empty")}</strong>
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
    return <p className="muted">{t("trainer.loading")}</p>;
  }

  if (!canAccessTrainer) {
    return (
      <div className="feature-card form-stack" role="status">
        <p className="muted">{t("trainer.unauthorized")}</p>
      </div>
    );
  }

  return (
    <div className="form-stack">
      <div className="feature-card form-stack">
        {isDemoMode ? <PreviewBanner /> : null}
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {isDemoMode ? t("trainer.demoMode") : t("trainer.viewingAsCoach")}
        </p>
        {activeEndpoint ? (
          <p className="muted" style={{ margin: 0 }}>
            {t("trainer.clientsEndpointPrefix")} {activeEndpoint}
          </p>
        ) : null}
      </div>

      <section className="section-stack" aria-labelledby="trainer-clients-title">
        <h2 id="trainer-clients-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.clients.title")}
          {isDemoMode ? <span className="chip">Demo</span> : null}
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
