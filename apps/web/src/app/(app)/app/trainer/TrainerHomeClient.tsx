"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserRoleFlags } from "@/lib/userCapabilities";
import { extractTrainerClients, type TrainerClient } from "@/lib/trainerClients";

type LoadState = "loading" | "ready" | "error";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientsState, setClientsState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [clients, setClients] = useState<TrainerClient[]>([]);

  const loadClients = useCallback(async () => {
    setClientsState("loading");

    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      if (!response.ok) {
        setClientsState("error");
        return;
      }

      const data = (await response.json()) as unknown;
      setClients(extractTrainerClients(data));
      setClientsState("ready");
    } catch {
      setClientsState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadPermission = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (active) setPermissionState("error");
          return;
        }

        const data = (await response.json()) as Record<string, unknown>;
        const roleFlags = getUserRoleFlags(data);

        if (!active) return;

        const canAccess = roleFlags.isTrainer || roleFlags.isAdmin;
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");

        if (canAccess) {
          void loadClients();
        }
      } catch {
        if (active) setPermissionState("error");
      }
    };

    void loadPermission();

    return () => {
      active = false;
    };
  }, [loadClients]);

  const listBody = useMemo(() => {
    if (clientsState === "loading") {
      return (
        <ul className="form-stack" aria-live="polite" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <li key={item} className="card" style={{ minHeight: 84 }}>
              <span className="muted">{t("trainer.clients.loadingItem")}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (clientsState === "error") {
      return (
        <div className="card form-stack" role="status" aria-live="polite">
          <p className="muted">{t("trainer.clients.error")}</p>
          <button type="button" className="btn secondary" style={{ minHeight: 44 }} onClick={() => void loadClients()}>
            {t("trainer.retry")}
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
              <Link
                href={`/app/trainer/client/${client.id}`}
                className="sidebar-link"
                style={{ display: "block", minHeight: 44 }}
                aria-label={`${t("trainer.clients.openClientAriaPrefix")} ${client.name}`}
              >
                <strong>{client.name}</strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {statusText}
                  {client.subscriptionStatus ? ` · ${client.subscriptionStatus}` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }, [clients, clientsState, loadClients, t]);

  if (permissionState === "loading") {
    return <p className="muted">{t("trainer.loading")}</p>;
  }

  if (permissionState === "error") {
    return <p className="muted">{t("trainer.error")}</p>;
  }

  if (!canAccessTrainer) {
    return (
      <div className="feature-card form-stack" role="status">
        <p className="muted">{t("trainer.unauthorized")}</p>
        <Link href="/app" className="btn secondary" style={{ width: "fit-content", minHeight: 44 }}>
          {t("trainer.backToDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="form-stack">
      <div className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.viewingAsCoach")}
        </p>
      </div>

      <section className="section-stack" aria-labelledby="trainer-clients-title">
        <h2 id="trainer-clients-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.clients.title")}
        </h2>
        {listBody}
      </section>
    </div>
  );
}
