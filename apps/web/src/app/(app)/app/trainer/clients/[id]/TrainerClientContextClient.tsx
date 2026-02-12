"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { hasTrainerClientContextCapability, hasTrainerClientsCapability } from "@/lib/capabilities";
import { getRoleFlags } from "@/lib/roles";

type AuthUser = Record<string, unknown>;

type ClientRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBlocked: boolean;
  lastLoginAt: string | null;
  subscriptionStatus: string | null;
};

type ClientsResponse = {
  users?: ClientRow[];
};

type LoadState = "loading" | "ready" | "error";

export default function TrainerClientContextClient() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientState, setClientState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meResponse.ok) {
          if (active) setPermissionState("error");
          return;
        }

        const meData = (await meResponse.json()) as AuthUser;
        const roleFlags = getRoleFlags(meData);

        if (!active) return;

        const canAccess = roleFlags.isTrainer || roleFlags.isAdmin;
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");

        if (!canAccess) return;

        setClientState("loading");
        const clientsResponse = await fetch("/api/admin/users?page=1", { cache: "no-store" });
        if (!clientsResponse.ok) {
          if (active) setClientState("error");
          return;
        }

        const data = (await clientsResponse.json()) as ClientsResponse;
        if (!active) return;

        if (!hasTrainerClientsCapability(data)) {
          setClient(null);
          setClientState("ready");
          return;
        }

        const users = Array.isArray(data.users) ? data.users : [];
        const selectedClient = users.find((user) => user.id === clientId && user.role !== "ADMIN") ?? null;
        setClient(selectedClient);
        setClientState("ready");
      } catch {
        if (active) {
          setPermissionState("error");
          setClientState("error");
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [clientId]);

  const clientName = useMemo(() => {
    if (!client) return t("trainer.clientContext.unknownClient");
    return client.name?.trim() || client.email;
  }, [client, t]);

  if (permissionState === "loading") {
    return <p className="muted">{t("trainer.loading")}</p>;
  }

  if (permissionState === "error") {
    return <p className="muted">{t("trainer.error")}</p>;
  }

  if (!canAccessTrainer) {
    return (
      <div className="card form-stack" role="status">
        <p className="muted">{t("trainer.unauthorized")}</p>
        <Link href="/app" className="btn secondary" style={{ width: "fit-content" }}>
          {t("trainer.backToDashboard")}
        </Link>
      </div>
    );
  }

  if (clientState === "loading") {
    return <p className="muted">{t("trainer.clientContext.loading")}</p>;
  }

  if (clientState === "error") {
    return (
      <div className="card form-stack" role="status">
        <p className="muted">{t("trainer.clientContext.error")}</p>
        <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content" }}>
          {t("trainer.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="form-stack">
      <header className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{clientName}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
        {client?.lastLoginAt ? (
          <p className="muted" style={{ margin: 0 }}>
            {`${t("trainer.clientContext.today.lastLoginPrefix")} ${new Date(client.lastLoginAt).toLocaleDateString()}`}
          </p>
        ) : null}
      </header>

      <section className="card form-stack" aria-labelledby="trainer-today-title">
        <h3 id="trainer-today-title" style={{ margin: 0 }}>{t("trainer.clientContext.today.title")}</h3>
        <p className="muted" style={{ margin: 0 }}>
          {client && hasTrainerClientContextCapability(client) && client.subscriptionStatus
            ? `${t("trainer.clientContext.today.subscriptionStatusPrefix")} ${client.subscriptionStatus}`
            : t("trainer.clientContext.unavailable")}
        </p>
      </section>

      <section className="card form-stack" aria-labelledby="trainer-tracking-title">
        <h3 id="trainer-tracking-title" style={{ margin: 0 }}>{t("trainer.clientContext.tracking.title")}</h3>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.unavailable")}</p>
      </section>

      <section className="card form-stack" aria-labelledby="trainer-plans-title">
        <h3 id="trainer-plans-title" style={{ margin: 0 }}>{t("trainer.clientContext.plans.title")}</h3>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.unavailable")}</p>
      </section>

      <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content" }}>
        {t("trainer.back")}
      </Link>
    </div>
  );
}
