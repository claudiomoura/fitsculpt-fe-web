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
type TabKey = "today" | "tracking" | "plans";
type SectionState = "loading" | "empty" | "ready" | "error";

export default function TrainerClientContextClient() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientState, setClientState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("today");

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

  const tabs: { key: TabKey; label: string }[] = useMemo(
    () => [
      { key: "today", label: t("trainer.clientContext.today.title") },
      { key: "tracking", label: t("trainer.clientContext.tracking.title") },
      { key: "plans", label: t("trainer.clientContext.plans.title") },
    ],
    [t],
  );

  const sectionStateByTab = useMemo<Record<TabKey, SectionState>>(() => {
    if (clientState === "loading") {
      return { today: "loading", tracking: "loading", plans: "loading" };
    }

    if (clientState === "error") {
      return { today: "error", tracking: "error", plans: "error" };
    }

    if (!client || !hasTrainerClientContextCapability(client)) {
      return { today: "empty", tracking: "empty", plans: "empty" };
    }

    return {
      today: client.subscriptionStatus ? "ready" : "empty",
      tracking: "empty",
      plans: "empty",
    };
  }, [client, clientState]);

  const renderSectionBody = () => {
    const sectionState = sectionStateByTab[activeTab];

    if (sectionState === "loading") {
      return <p className="muted">{t("trainer.clientContext.loading")}</p>;
    }

    if (sectionState === "error") {
      return (
        <div className="form-stack">
          <p className="muted">{t("trainer.clientContext.error")}</p>
          <button className="btn secondary" type="button" onClick={() => window.location.reload()}>
            {t("trainer.retry")}
          </button>
        </div>
      );
    }

    if (sectionState === "empty") {
      return <p className="muted">{t("trainer.clientContext.unavailable")}</p>;
    }

    if (activeTab === "today") {
      return (
        <div className="form-stack">
          {client?.lastLoginAt ? (
            <p className="muted" style={{ margin: 0 }}>
              {`${t("trainer.clientContext.today.lastLoginPrefix")} ${new Date(client.lastLoginAt).toLocaleDateString()}`}
            </p>
          ) : null}
          <p className="muted" style={{ margin: 0 }}>
            {`${t("trainer.clientContext.today.subscriptionStatusPrefix")} ${client?.subscriptionStatus ?? "-"}`}
          </p>
        </div>
      );
    }

    return <p className="muted">{t("trainer.clientContext.unavailable")}</p>;
  };

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

  return (
    <div className="form-stack">
      <header className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{clientName}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.viewingAsCoach")}
        </p>
      </header>

      <section className="card form-stack" aria-label={t("trainer.clientContext.title")}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? "btn" : "btn secondary"}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="card form-stack" role="status" aria-live="polite">
          <h3 style={{ margin: 0 }}>{tabs.find((tab) => tab.key === activeTab)?.label}</h3>
          {renderSectionBody()}
        </div>
      </section>

      <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content" }}>
        {t("trainer.back")}
      </Link>
    </div>
  );
}
