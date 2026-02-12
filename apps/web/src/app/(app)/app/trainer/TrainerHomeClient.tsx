"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserRoleFlags } from "@/lib/userCapabilities";
import { hasTrainerClientsCapability } from "@/lib/capabilities";
import { auditTrainerExerciseCapabilities } from "@/lib/trainer-exercises/capabilityAudit";

type AuthUser = Record<string, unknown>;

type ClientRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBlocked: boolean;
  subscriptionStatus: string | null;
};

type ClientsResponse = {
  users?: ClientRow[];
};

type LoadState = "loading" | "ready" | "error";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientsState, setClientsState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [canCreateExercise, setCanCreateExercise] = useState(false);

  const loadClients = useCallback(async () => {
    setClientsState("loading");

    try {
      const response = await fetch("/api/admin/users?page=1", { cache: "no-store" });
      if (!response.ok) {
        setClientsState("error");
        return;
      }

      const data = (await response.json()) as ClientsResponse;
      if (!hasTrainerClientsCapability(data)) {
        setClients([]);
        setClientsState("ready");
        return;
      }

      const list = Array.isArray(data.users) ? data.users : [];
      setClients(list.filter((client) => client.role !== "ADMIN"));
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

        const [data, capabilities] = await Promise.all([
          response.json() as Promise<AuthUser>,
          auditTrainerExerciseCapabilities(),
        ]);
        const roleFlags = getUserRoleFlags(data);

        if (!active) return;

        const canAccess = roleFlags.isTrainer || roleFlags.isAdmin;
        setCanAccessTrainer(canAccess);
        setCanCreateExercise(capabilities.canCreateExercise);
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

  const hasClients = clients.length > 0;

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
          <button type="button" className="btn secondary" onClick={() => void loadClients()}>
            {t("trainer.retry")}
          </button>
        </div>
      );
    }

    if (!hasClients) {
      return (
        <div className="card" role="status" aria-live="polite">
          <p className="muted">{t("trainer.clients.empty")}</p>
        </div>
      );
    }

    return (
      <ul className="form-stack" aria-label={t("trainer.clients.title")}>
        {clients.map((client) => {
          const clientName = client.name?.trim() || client.email;
          const statusText = client.isBlocked ? t("trainer.clients.blocked") : t("trainer.clients.active");

          return (
            <li key={client.id} className="card">
              <Link
                href={`/app/trainer/clients/${client.id}`}
                className="sidebar-link"
                style={{ display: "block", minHeight: 44 }}
                aria-label={`${t("trainer.clients.openClientAriaPrefix")} ${clientName}`}
              >
                <strong>{clientName}</strong>
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
  }, [clients, clientsState, hasClients, loadClients, t]);

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
        <Link href="/app" className="btn secondary" style={{ width: "fit-content" }}>
          {t("trainer.backToDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="form-stack">
      <div className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
      </div>

      <section className="section-stack" aria-labelledby="trainer-exercises-title">
        <h2 id="trainer-exercises-title" className="section-title" style={{ fontSize: 20 }}>
          {t("library.tabs.exercises")}
        </h2>
        <div className="card form-stack">
          {canCreateExercise ? (
            <Link href="/app/treinador/exercicios" className="btn secondary" style={{ width: "fit-content" }}>
              {t("library.tabs.exercises")}
            </Link>
          ) : (
            <p className="muted" style={{ margin: 0 }}>{t("trainer.notAvailable")}</p>
          )}
        </div>
      </section>

      <section className="section-stack" aria-labelledby="trainer-clients-title">
        <h2 id="trainer-clients-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.clients.title")}
        </h2>
        {listBody}
      </section>
    </div>
  );
}
